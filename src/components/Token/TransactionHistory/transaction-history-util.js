import flatmap from 'lodash.flatmap';

export function buildTransactionsMovements(transactions, addresses) {
  const addressSet = new Set(addresses);

  return flatmap(transactions.map(tx => buildTransactionMovements(tx, addressSet)));
}

function buildTransactionMovements(tx, addressSet) {
  const result = [];

  const isCoinbase = !!tx.getInputs()['FA1zT4aFpEvcnPqPCigB3fvGu4Q4mTXY22iiuV69DqE1pNhdF2MC'];
  const isBurn = !!tx.getOutputs()['FA1zT4aFpEvcnPqPCigB3fvGu4Q4mTXY22iiuV69DqE1pNhdF2MC'];

  for (const address in tx.getOutputs()) {
    if (addressSet.has(address)) {
      result.push(
        buildTransactionMovement({
          tx,
          address,
          sign: '+',
          amount: tx.getOutputs()[address],
          isCoinbase
        })
      );
    }
  }
  for (const address in tx.getInputs()) {
    if (addressSet.has(address)) {
      result.push(
        buildTransactionMovement({
          tx,
          address,
          sign: '-',
          amount: tx.getInputs()[address],
          isBurn
        })
      );
    }
  }

  return result;
}

function buildTransactionMovement({ tx, address, sign, amount, isCoinbase = false, isBurn = false }) {
  return {
    id: tx.getEntryhash(),
    address,
    sign,
    amount: Array.isArray(amount) ? computeTotalBalanceOfNfTokens(amount) : amount,
    timestamp: tx.getTimestamp(),
    coinbase: isCoinbase,
    burn: isBurn
  };
}

function computeTotalBalanceOfNfTokens(tokens) {
  return tokens.reduce(function(acc, token) {
    switch (typeof token) {
      case 'number':
        return acc + 1;
      case 'object':
        return acc + token.max - token.min + 1;
      default:
        throw new Error('Unsupported token', token);
    }
  }, 0);
}

export function transformInoutputsToArray(inoutputs) {
  return Object.keys(inoutputs).map(address => ({
    address,
    amount: inoutputs[address]
  }));
}

export function getTotalTransaction(transaction) {
  const toSum =
    Object.keys(transaction.getInputs()) < Object.keys(transaction.getOutputs())
      ? Object.values(transaction.getInputs())
      : Object.values(transaction.getOutputs());

  return toSum
    .map(amount => (Array.isArray(amount) ? computeTotalBalanceOfNfTokens(amount) : amount))
    .reduce((acc, val) => acc + val, 0);
}
