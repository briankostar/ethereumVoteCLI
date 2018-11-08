# Ethereum Voting

## What is it
This is a CLI application that uses a smart contract to commit votes and then later on reveal the votes to determine the winner.

It's based on the blog written by Karl Floresch [here](https://karl.tech/learning-solidity-part-2-voting/).

## How to install & setup:
First inlcude all dependencies:

This application uses the latest truffle beta version to compile solidity.

If your truffle version is behind, first do 'npm uninstall truffle'

npm install -g truffle@beta

npm install -g ganache-cli

npm install

Run ganache-cli locally:

ganache-cli

After ganache runs successfully, copy one of the Eth Accounts displayed and replace the config.DEFAULT_ACCOUNT in the cli/cli.js

Compile & Migrate solidity

truffle compile

truffle migrate

npm link

## How to use:
ethvote start

ethvote status

ethvote commit

ethvote reveal

First, you must run 'ethvote start' to deploy the contract

Then, call 'ethvote status' at any point to view the voting statistics.

'ethvote commit' and 'ethvote reveal' will open a promp to guide you on voting

'ethvote --help or -h' for options

