#!/usr/bin/env node

const fs = require('fs');
const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");
const Web3 = require('web3');
const keccak256 = require('js-sha3').keccak256;
const storage = require('node-persist');
const program = require('commander');
const dotenv = require('dotenv')
const envConf = dotenv.config().parsed; //To use in production
const log = console.log;

//Update config to use, especially DEFAULT_ACCOUNT
const config = {
    "NETWORK": "http://127.0.0.1:8545",
    "DEFAULT_ACCOUNT": '0xc782f1e484b190237f003ea056f6ba18b553fce0',
    "GAS": "4712388",
    "GAS_PRICE": 100000000000,
    "VOTING_TIME": 60,
    "QUESTION": "Do you think DOGS make better pets than CATS?",
    "CHOICE1": "YES",
    "CHOICE2": "NO",
    "CONTRACT_ADDRESS": ""
}

const sendOption = {
    from: config.DEFAULT_ACCOUNT,
    gas: config.GAS,
    gasPrice: config.GAS_PRICE
}

let CommitRevealContract;
let jsonFile = "./build/contracts/CommitReveal.json";
let contractFile = JSON.parse(fs.readFileSync(jsonFile));
let abi = contractFile.abi;

const web3 = new Web3(new Web3.providers.HttpProvider(config.NETWORK))
web3.eth.defaultAccount = config.DEFAULT_ACCOUNT;

program
    .version('0.1.0')
    .description('Shows version number')

program
    .command('status')
    .description('Show status of voting process')
    .action(() => {
        status();
    })

program
    .command('start')
    .description('Starts the voting process')
    .action(() => {
        startVote();
    })
program
    .command('commit')
    .description('Prompts commands to vote')
    .action(() => {
        const questions = [
            {
                name: "vote",
                type: "list",
                message: config.QUESTION,
                choices: [config.CHOICE1, config.CHOICE2],
                filter: function (val) {
                    return (val === config.CHOICE1) ? 1 : 2;
                }
            },
            {
                name: 'secret',
                type: 'input',
                message: "Enter a secret to hash with this vote. Remeber this for vote reveal later!"
            }
        ];

        inquirer.prompt(questions).then(answers => {
            commitVote(answers)
        })
    })

program
    .command('reveal')
    .description('Starts the vote counting process')
    .action(() => {
        const questions = [
            {
                name: "vote",
                type: "list",
                message: "Lets reveal your votes. First, what was the vote you made?",
                choices: [config.CHOICE1, config.CHOICE2],
                filter: function (val) {
                    return (val === config.CHOICE1) ? 1 : 2;
                }
            },
            {
                name: 'secret',
                type: 'input',
                message: "Now enter the secret used to hash this vote."
            }
        ];

        inquirer.prompt(questions).then(answers => {
            revealVote(answers)
        })
    })

const status = async () => {
    const CONTRACT_ADDRESS = await storage.getItem('CONTRACT_ADDRESS')
    const VOTE_END_TIME = parseInt(await CommitRevealContract.methods.commitPhaseEndTime().call()) * 1000; //multiply to get ms
    const VOTES_COUNT = parseInt(await CommitRevealContract.methods.numberOfVotesCast().call());
    const VOTESFORCHOICE1 = parseInt(await CommitRevealContract.methods.votesForChoice1().call());
    const VOTESFORCHOICE2 = parseInt(await CommitRevealContract.methods.votesForChoice2().call());
    const VOTES_REVEALED_COUNT = VOTESFORCHOICE1 + VOTESFORCHOICE2;

    if (!CONTRACT_ADDRESS) {
        log('Current Phase: ' + chalk.green('Pre-Voting'))
        log('To start the voting process, enter \'ethvote start\'')
    } else if (CONTRACT_ADDRESS && (Date.now() < VOTE_END_TIME)) {
        log('Current Phase: ' + chalk.green('Voting'))
        let timeleft = (VOTE_END_TIME - Date.now()) / 1000
        log(`Time Left in this Period: ${chalk.green(timeleft)} seconds`)
        log(`Number of Votes Revealed: ${VOTES_REVEALED_COUNT}`)
        log(`Number of Votes Committed: ${VOTES_COUNT}`)
    } else if (CONTRACT_ADDRESS && (Date.now() > VOTE_END_TIME) && (VOTES_COUNT > VOTES_REVEALED_COUNT)) {
        log('Current Phase: ' + chalk.green('Revealing'))
        log(`Time Left in this Period: ${chalk.green('Indefinite until all votes revealed')}`)
        log(`Number of Votes Revealed: ${VOTES_REVEALED_COUNT}`)
        log(`Number of Votes Committed: ${VOTES_COUNT}`)
    } else if (CONTRACT_ADDRESS && (Date.now() > VOTE_END_TIME) && (VOTES_COUNT === VOTES_REVEALED_COUNT)) {
        log('Current Phase: ' + chalk.green('Revealed'))
        log(`Number of Votes Revealed: ${VOTES_REVEALED_COUNT}`)
        log(`Number of Votes Committed: ${VOTES_COUNT}`)
        log('All Votes have been counted for. Majority said.. ', await getWinner())
    } else {
        log('Unknown status error')
    }
}

const banner = () => {
    log(
        chalk.green(
            figlet.textSync("ETHVOTE", {
                // font: "dr pepper",
                horizontalLayout: 'fitted',
                verticalLayout: 'fitted'
            })
        )
    );
}

const startVote = async () => {
    banner();

    log('Deploying contract and starting the voting process..')
    await storage.clear();

    await CommitRevealContract.deploy({ data: contractFile.bytecode, arguments: [config.VOTING_TIME, config.CHOICE1, config.CHOICE2] })
        // use truffle default values
        .send(sendOption, (error, transactionHash) => {
            // log('error, transactionHash', error, transactionHash) 
        })
        // .on('error', (error) => { log('error') })
        // .on('transactionHash', (transactionHash) => { log('transactionHash', transactionHash) })
        // .on('receipt', (receipt) => { log('receipt', receipt) })
        // .on('confirmation', (confirmationNumber, receipt) => { log('confirm', confirmationNumber, receipt) })
        .then((newContractInstance) => {
            CommitRevealContract.options.address = newContractInstance.options.address;
            storage.setItem('CONTRACT_ADDRESS', newContractInstance.options.address);
            log(`Contract is deployed. There are approx ${config.VOTING_TIME} seconds left to vote!`)
            log(`Use the command ${chalk.green('ethvote commit')} to start voting!`)
        })
        .catch((error) => {
            log('Error Occurred', error)
        })
}

const commitVote = async (answers) => {
    let inputStr = answers.vote + answers.secret
    let outputHash = "0x" + keccak256(inputStr)

    CommitRevealContract.methods.commitVote(outputHash)
        .send(sendOption)
        .then((success) => {
            log('Thanks! Vote was sucessfully committed!')
        })
        .catch((error) => {
            log('Error Occurred. Check status to make sure voting is still in progress', error)
        })
}

const revealVote = async (answers) => {
    let inputStr = answers.vote + answers.secret
    let outputHash = "0x" + keccak256(inputStr)

    CommitRevealContract.methods.revealVote(inputStr, outputHash)
        .send(sendOption)
        .then((success) => {
            log('Nice! Vote was sucessfully revealed!')
        })
        .catch((error) => {
            log('Error Occurred. Check status to make sure voting is in reveal phase or if you entered the right inputs', error)
        })
}

const getWinner = async () => {
    return await CommitRevealContract.methods.getWinner().call();
}

const main = async () => {
    //To persist deployed contract address
    await storage.init({ dir: '.tmp/', expiredInterval: 5 * 60 * 1000 });

    CommitRevealContract = new web3.eth.Contract(abi)
    CommitRevealContract.options.address = await storage.getItem('CONTRACT_ADDRESS');

    let myBalanceWei = await web3.eth.getBalance(web3.eth.defaultAccount)
    let myBalance = await web3.utils.fromWei(myBalanceWei, 'ether')
    log('ETH Balance on this account is: ', myBalance)

    program.parse(process.argv);
}

main();
