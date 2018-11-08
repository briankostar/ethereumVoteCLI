const { expect } = require("chai");
const CommitReveal = artifacts.require("CommitReveal");
const BN = require("bn.js");
const Web3Wrapper = require("@0xproject/web3-wrapper").Web3Wrapper;
const BlockchainLifecycle = require("@0xproject/dev-utils").BlockchainLifecycle;
const moment = require("moment");

contract("CommitReveal", async accounts => {
  let commitRevealWrapper = null;
  let web3Wrapper = null;
  let blockchainLifecycle = null;

  before("set up wrapper", async () => {
    commitRevealWrapper = await CommitReveal.deployed();
    web3Wrapper = new Web3Wrapper(web3.currentProvider);
    blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);
  });

  beforeEach("take snapshot", async () => {
    await blockchainLifecycle.startAsync();
  });

  it("should record a proper commit", async () => {
    const vote = "1~mybigsecret";
    const commit = web3.utils.soliditySha3(vote);
    await commitRevealWrapper.commitVote(commit);
    const commitsArray = await commitRevealWrapper.getVoteCommitsArray();
    const voteStatus = await commitRevealWrapper.voteStatuses(commit);
    const numberOfVotes = await commitRevealWrapper.numberOfVotesCast();
    expect(commitsArray[0]).to.equal(commit);
    expect(voteStatus).to.equal("Committed");
    expect(numberOfVotes.eq(new BN(1))).to.be.true;
  });

  it("should record a proper reveal", async () => {
    const vote = "1~mybigsecret";
    const commit = web3.utils.soliditySha3(vote);
    await commitRevealWrapper.commitVote(commit);
    await web3Wrapper.increaseTimeAsync(
      moment.duration(2, "minutes").asSeconds()
    );
    await commitRevealWrapper.revealVote(vote, commit);
    const votesFor1 = await commitRevealWrapper.votesForChoice1();
    const voteStatus = await commitRevealWrapper.voteStatuses(commit);
    expect(votesFor1.eq(new BN(1))).to.be.true;
    expect(voteStatus).to.equal("Revealed");
  });

  it("should correctly get winner", async () => {
    const vote = "1~mybigsecret";
    const commit = web3.utils.soliditySha3(vote);
    await commitRevealWrapper.commitVote(commit);
    await web3Wrapper.increaseTimeAsync(
      moment.duration(2, "minutes").asSeconds()
    );
    await commitRevealWrapper.revealVote(vote, commit);
    const winner = await commitRevealWrapper.getWinner();
    expect(winner).to.equal("YES")
  })

  afterEach("revert snapshot", async () => {
    await blockchainLifecycle.revertAsync();
  });
});
