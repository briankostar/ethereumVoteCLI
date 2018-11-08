var CommitReveal = artifacts.require("CommitReveal.sol");

module.exports = function(deployer) {
  deployer.deploy(CommitReveal, 120, "YES", "NO");
};
