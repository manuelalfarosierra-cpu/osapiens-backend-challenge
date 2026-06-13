# Installation Guide

## Clone the Repository

```bash
git clone https://github.com/manuelalfarosierra-cpu/osapiens-backend-challenge.git
cd osapiens-backend-challenge
```

## Pin Node.js 20

> Warning: this project is pinned to Node.js 20 through the local `.nvmrc` file. Using a different major version may lead to inconsistent behavior during development or testing.

### Using `nvm`

```bash
nvm use
```

If Node.js 20 is not installed yet:

```bash
nvm install 20
nvm use 20
```

### Using `fnm`

```bash
fnm use --install-if-missing 20
```

## Install Dependencies

```bash
npm install
```

## Run the Project

### Development Mode

```bash
npm run dev
```

This command starts the application with `nodemon`, so source changes are monitored and the server reloads automatically during development.

### Standard Run

```bash
npm start
```

This command starts the application with `ts-node` without the development file watcher.

## Test Commands

Run the full test suite:

```bash
npm test
```

Run tests with a verbose reporter:

```bash
npm run test:verbose
```

Run tests in watch mode:

```bash
npm run test:watch
```
