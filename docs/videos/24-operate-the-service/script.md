# 24 · Operate the service

## Introduction

This last journey is for Dad as the operator. Shelfie runs on one small Ubuntu virtual machine in Canada Central, and the runbook says what to do when something needs a hand.

## Health checks

The first question is always: is it up? Open the health address of the API in a browser. While the database is reachable, it answers status ok.

If the database cannot be reached, it answers unavailable instead, with status five oh three. Every deploy waits for this check and rolls back if it fails.

## Logs and backups

The API writes one line of JSON per request, with the request ID, method, route, status and duration. Bodies, headers and web addresses are never logged. When an error page shows a code, search the log for it to find the full error.

Every night at eight fifteen UTC, a backup job copies the SQLite database to a dated file, checks its integrity, and uploads it to blob storage. Thirty days are kept.

## Recap

Things to remember. Health answers ok or unavailable. Logs live in journald on the machine. And the last three releases stay there too, so you can roll back to an earlier one.
