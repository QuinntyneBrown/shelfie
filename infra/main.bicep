// Production environment for Shelfie: one small Ubuntu VM running Caddy + the Node API, a managed
// PostgreSQL flexible server reachable only inside the virtual network, a storage account that
// holds release tarballs and nightly database dumps, and Azure Communication Services Email, which
// sends Shelfie's mail from hello@shelfie.kids (ADR-0019). Deployed once by infra/bootstrap.sh; code
// deploys never touch it.

targetScope = 'resourceGroup'

@description('Prefix for every resource name.')
param name string = 'shelfie'

@description('Azure region.')
param location string = resourceGroup().location

@description('VM size. B2ats_v2 is 2 burstable vCPUs and 1 GiB, enough for Node, Caddy and SQLite.')
param vmSize string = 'Standard_B2ats_v2'

@description('Admin user that may SSH in from adminSourceAddress.')
param adminUsername string = 'shelfie-admin'

@description('SSH public key of the admin user.')
param adminSshPublicKey string

@description('Public IPv4 address or CIDR allowed to reach SSH (port 22).')
param adminSourceAddress string

@description('Hostname of the app and its API, used for APP_URL; the domain\'s A record must point at the public IP output and app must be a CNAME to it.')
param hostname string = 'app.shelfie.kids'

@description('Administrator password of the PostgreSQL server. bootstrap.sh generates it once and keeps it on the VM in /etc/shelfie/db-admin.')
@secure()
param databaseAdminPassword string

@description('Domain Shelfie sends mail from; its DNS stays at Namecheap (docs/runbook.md, "Mail").')
param emailDomain string = 'shelfie.kids'

@description('Link the e-mail domain to Communication Services. True only once Azure reports the domain, SPF and both DKIM records verified; ACS refuses an unverified domain.')
param linkEmailDomain bool = false

@description('PostgreSQL compute. B1ms is 1 burstable vCore and 2 GiB, enough for the API\'s pool of 10 connections.')
param databaseSku string = 'Standard_B1ms'

var storageAccountName = toLower('${name}${uniqueString(resourceGroup().id)}')
var databaseServerName = toLower('${name}-db-${uniqueString(resourceGroup().id)}')
var storageBlobDataContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
var communicationEmailOwner = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '09976791-48a7-449e-bb21-39d1a415f350')
var cloudInit = replace(replace(loadTextContent('cloud-init.yaml'), '__HOSTNAME__', hostname), '__STORAGE_ACCOUNT__', storageAccountName)

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }

  resource blobs 'blobServices' = {
    name: 'default'
    resource releases 'containers' = { name: 'releases' }
    resource backups 'containers' = { name: 'backups' }
  }

  // Nightly dumps are kept for 30 days; the server's own point-in-time restore covers the last 7.
  resource lifecycle 'managementPolicies' = {
    name: 'default'
    properties: {
      policy: {
        rules: [
          {
            name: 'prune-backups'
            enabled: true
            type: 'Lifecycle'
            definition: {
              filters: { blobTypes: ['blockBlob'], prefixMatch: ['backups/'] }
              actions: { baseBlob: { delete: { daysAfterModificationGreaterThan: 30 } } }
            }
          }
        ]
      }
    }
  }
}

resource nsg 'Microsoft.Network/networkSecurityGroups@2024-05-01' = {
  name: '${name}-nsg'
  location: location
  properties: {
    securityRules: [
      {
        name: 'allow-https'
        properties: { priority: 100, direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourceAddressPrefix: 'Internet', sourcePortRange: '*', destinationAddressPrefix: '*', destinationPortRange: '443' }
      }
      {
        name: 'allow-http-for-acme-and-redirect'
        properties: { priority: 110, direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourceAddressPrefix: 'Internet', sourcePortRange: '*', destinationAddressPrefix: '*', destinationPortRange: '80' }
      }
      {
        name: 'allow-ssh-from-admin'
        properties: { priority: 120, direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourceAddressPrefix: adminSourceAddress, sourcePortRange: '*', destinationAddressPrefix: '*', destinationPortRange: '22' }
      }
    ]
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: '${name}-vnet'
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.0.0.0/24', '10.0.1.0/24'] }
    subnets: [
      { name: 'default', properties: { addressPrefix: '10.0.0.0/24' } }
      {
        // Delegated to the flexible server; nothing else can be placed in it.
        name: 'database'
        properties: {
          addressPrefix: '10.0.1.0/24'
          delegations: [{ name: 'postgres', properties: { serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers' } }]
        }
      }
    ]
  }
}

resource publicIp 'Microsoft.Network/publicIPAddresses@2024-05-01' = {
  name: '${name}-ip'
  location: location
  sku: { name: 'Standard' }
  properties: {
    publicIPAllocationMethod: 'Static'
    publicIPAddressVersion: 'IPv4'
  }
}

resource nic 'Microsoft.Network/networkInterfaces@2024-05-01' = {
  name: '${name}-nic'
  location: location
  properties: {
    networkSecurityGroup: { id: nsg.id }
    ipConfigurations: [
      {
        name: 'ipconfig'
        properties: {
          subnet: { id: vnet.properties.subnets[0].id }
          privateIPAllocationMethod: 'Dynamic'
          publicIPAddress: { id: publicIp.id }
        }
      }
    ]
  }
}

resource vm 'Microsoft.Compute/virtualMachines@2024-07-01' = {
  name: '${name}-vm'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    hardwareProfile: { vmSize: vmSize }
    storageProfile: {
      imageReference: { publisher: 'Canonical', offer: 'ubuntu-24_04-lts', sku: 'server', version: 'latest' }
      osDisk: {
        name: '${name}-osdisk'
        createOption: 'FromImage'
        diskSizeGB: 32
        managedDisk: { storageAccountType: 'StandardSSD_LRS' }
        deleteOption: 'Delete'
      }
    }
    osProfile: {
      computerName: name
      adminUsername: adminUsername
      customData: base64(cloudInit)
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: { publicKeys: [{ path: '/home/${adminUsername}/.ssh/authorized_keys', keyData: adminSshPublicKey }] }
        patchSettings: { patchMode: 'ImageDefault' }
      }
    }
    networkProfile: { networkInterfaces: [{ id: nic.id, properties: { deleteOption: 'Delete' } }] }
    diagnosticsProfile: { bootDiagnostics: { enabled: true } }
  }
}

// The VM downloads releases from and uploads backups to the storage account with its managed identity.
resource vmBlobAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, vm.id, storageBlobDataContributor)
  scope: storage
  properties: {
    principalId: vm.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: storageBlobDataContributor
  }
}

// Mail: the customer-managed shelfie.kids domain with the hello sender, shown as "Shelfie". Its data stays in Canada.
resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: '${name}-email'
  location: 'global'
  properties: { dataLocation: 'Canada' }

  resource domain 'domains' = {
    name: emailDomain
    location: 'global'
    properties: { domainManagement: 'CustomerManaged', userEngagementTracking: 'Disabled' }

    resource hello 'senderUsernames' = {
      name: 'hello'
      properties: { username: 'hello', displayName: 'Shelfie' }
    }
  }
}

resource communication 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: '${name}-comms'
  location: 'global'
  properties: {
    dataLocation: 'Canada'
    linkedDomains: linkEmailDomain ? [emailService::domain.id] : []
  }
}

// The API sends with the VM's managed identity; there is no connection string or key.
resource vmSendsMail 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(communication.id, vm.id, communicationEmailOwner)
  scope: communication
  properties: {
    principalId: vm.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: communicationEmailOwner
  }
}

// The server's name resolves to its private address only through this zone, which the VM's network is linked to.
resource databaseDns 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: '${name}.private.postgres.database.azure.com'
  location: 'global'

  resource link 'virtualNetworkLinks' = {
    name: '${name}-vnet'
    location: 'global'
    properties: { virtualNetwork: { id: vnet.id }, registrationEnabled: false }
  }
}

// Managed PostgreSQL 16: no public endpoint, TLS required, storage encrypted with service-managed keys,
// 7 days of automated backups with point-in-time restore.
resource database 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: databaseServerName
  location: location
  sku: { name: databaseSku, tier: 'Burstable' }
  properties: {
    version: '16'
    administratorLogin: 'shelfie_admin'
    administratorLoginPassword: databaseAdminPassword
    storage: { storageSizeGB: 32, autoGrow: 'Enabled' }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    dataEncryption: { type: 'SystemManaged' }
    authConfig: { passwordAuth: 'Enabled', activeDirectoryAuth: 'Disabled' }
    network: {
      delegatedSubnetResourceId: vnet.properties.subnets[1].id
      privateDnsZoneArmResourceId: databaseDns.id
      publicNetworkAccess: 'Disabled'
    }
  }
  dependsOn: [databaseDns::link]

  resource shelfie 'databases' = {
    name: 'shelfie'
    properties: { charset: 'UTF8', collation: 'en_US.utf8' }
  }
}

output publicIp string = publicIp.properties.ipAddress
output databaseHost string = database.properties.fullyQualifiedDomainName
output vmName string = vm.name
output storageAccountName string = storage.name
output emailServiceName string = emailService.name
output acsEmailEndpoint string = 'https://${communication.properties.hostName}'
output acsEmailSender string = 'hello@${emailDomain}'
