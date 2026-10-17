// Production environment for Shelfie: one small Ubuntu VM running Caddy + the Node API with SQLite
// on its local disk, and a storage account that holds release tarballs and nightly database backups.
// Deployed once by infra/bootstrap.sh; code deploys never touch it.

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

@description('Public hostname Caddy serves; the A record must point at the public IP output.')
param hostname string = 'shelfie.kids'

var storageAccountName = toLower('${name}${uniqueString(resourceGroup().id)}')
var storageBlobDataContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
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
    addressSpace: { addressPrefixes: ['10.0.0.0/24'] }
    subnets: [
      { name: 'default', properties: { addressPrefix: '10.0.0.0/24' } }
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

output publicIp string = publicIp.properties.ipAddress
output vmName string = vm.name
output storageAccountName string = storage.name
