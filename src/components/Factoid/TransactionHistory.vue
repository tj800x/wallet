<template>
  <div>
    <v-flex xs12 text-xs-center class="font-italic" mb-4>
      Please note this page does not show pending transactions, only transactions recorded in a block.
    </v-flex>
    <v-list v-if="movements.length > 0">
      <template v-for="(mvt, index) in movements">
        <v-list-tile :key="mvt.key" @click.stop="openDetails(mvt.txId)">
          <v-layout wrap>
            <v-flex xs2>{{ mvt.date | formatDate }}</v-flex>
            <v-flex xs7 class="font-italic break-word">{{ displayAddress(mvt.address) }}</v-flex>
            <v-flex xs3 class="font-weight-bold" :class="amountColorClass(mvt.sign)" text-xs-right>
              <v-icon v-if="mvt.coinbase" color="secondary" title="Coinbase" left>star</v-icon>
              {{ mvt.sign }}
              {{ mvt.amount }}
              {{ mvt.symbol }}
            </v-flex>
          </v-layout>
        </v-list-tile>
        <v-divider v-if="index + 1 < movements.length" :key="index"></v-divider>
      </template>
    </v-list>
    <v-flex v-else text-xs-center xs12>
      <v-sheet elevation="1">
        <div class="subheading font-italic no-transaction-padding">No past transactions.</div>
      </v-sheet>
    </v-flex>
    <v-flex id="bottomButton" xs12 text-xs-center mt-3>
      <v-btn v-if="!allLoaded" large color="primary" :loading="loading" @click="loadMoreMovements">
        <v-icon left>arrow_drop_down_circle</v-icon>Load more transactions
      </v-btn>
    </v-flex>
    <TransactionDetailsDialog ref="transactionDetailsDialog" :addresses="addressesSet"></TransactionDetailsDialog>
  </div>
</template>

<script>
import axios from 'axios';
import querystring from 'querystring';
import moment from 'moment';
import { buildTransactionsMovements } from './TransactionHistory/transaction-history-util.js';
import TransactionDetailsDialog from './TransactionHistory/TransactionDetailsDialog';

const tfaApi = axios.create({
  baseURL: 'https://explorer.factoid.org/api/v1/address/transactions/'
});

const PAGINATION_LIMIT = 10;

export default {
  name: 'TransactionHistory',
  components: { TransactionDetailsDialog },
  data() {
    return {
      movements: [],
      transactions: {},
      nextPage: 0,
      loading: false,
      allLoaded: false
    };
  },
  computed: {
    addresses() {
      return this.$store.state.address.fctAddresses.concat(this.$store.state.address.ecAddresses);
    },
    addressesSet() {
      return new Set(this.addresses);
    },
    addressNames() {
      return this.$store.state.address.names;
    }
  },
  created() {
    this.loadMoreMovements();
  },
  methods: {
    displayAddress(address) {
      return this.addressNames[address] || address;
    },
    amountColorClass(sign) {
      return sign === '+' ? 'green--text' : 'red--text';
    },
    async loadMoreMovements() {
      const initialLoad = this.movements.length === 0;

      try {
        this.loading = true;
        const nbTxsLoaded = await this.fetchPage(this.nextPage);
        this.nextPage++;

        if (nbTxsLoaded < PAGINATION_LIMIT) {
          this.allLoaded = true;
          if (!initialLoad) {
            this.$store.commit('snackInfo', 'No more transaction');
          }
        }
      } catch (e) {
        this.$store.commit('snackError', e.message);
      } finally {
        this.loading = false;
      }

      if (!initialLoad) {
        const vuetify = this.$vuetify;
        this.$nextTick(() => vuetify.goTo('#bottomButton'));
      }
    },
    async fetchPage(page) {
      const url = `${this.addresses.join(',')}?${querystring.stringify({
        limit: PAGINATION_LIMIT,
        offset: page * PAGINATION_LIMIT
      })}`;

      const { data } = await tfaApi.get(url);

      if (data.error) {
        throw new Error(data.error);
      }
      if (!data.result.transactions) {
        return 0;
      }
      const transactions = data.result.transactions;

      transactions.forEach(tx => (this.transactions[tx.txid] = tx));
      this.movements = this.movements.concat(buildTransactionsMovements(transactions, this.addresses));

      return transactions.length;
    },
    openDetails(txId) {
      this.$refs.transactionDetailsDialog.show(this.transactions[txId]);
    }
  },
  filters: {
    formatDate(date) {
      return moment(date).format('L LT');
    }
  }
};
</script>

<style scoped>
.no-transaction-padding {
  padding: 8px;
}
</style>
