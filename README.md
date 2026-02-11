# MDsystem

MDsystem is a monorepo with API and web apps for managing and searching document data.

## Structure

- apps/api: backend service
- apps/web: frontend application
- deploy: deployment configs
- scripts: setup helpers
- theme-editor: local theme editor

## Requirements

- Node.js and pnpm

## Install

pnpm install

## Development

- API: pnpm --filter @mdsystem/api dev
- Web: pnpm --filter @mdsystem/web dev

## Build

pnpm -r build
