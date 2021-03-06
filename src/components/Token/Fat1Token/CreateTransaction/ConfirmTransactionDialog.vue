<template>
  <v-dialog v-model="display" max-width="800px" @keydown.esc="close" persistent>
    <v-card>
      <v-card-title class="headline primary white--text" primary-title>Confirm transaction</v-card-title>
      <v-card-text>
        <v-layout wrap>
          <v-flex xs12 text-xs-center class="subheading" my-2>Sending the following tokens</v-flex>
          <v-flex xs12 text-xs-center>
            <v-chip
              v-for="id in selectedTokens"
              :key="id.min"
              outline
              color="secondary"
              class="font-weight-bold subheading"
              >{{ id | displayIds }}</v-chip
            >
          </v-flex>
          <v-flex xs12 text-xs-center class="subheading" my-2>to</v-flex>
          <v-flex xs12 text-xs-center class="title secondary--text" my-2>{{ outputAddress }}</v-flex>
          <v-flex xs12 v-if="metadata" text-xs-center class="subheading secondary--text" my-2>
            (with metadata attached)
          </v-flex>
          <v-flex xs12 my-3 v-show="withLedger"> <v-divider></v-divider> </v-flex>
          <v-flex xs12 v-show="withLedger">
            <LedgerSigning
              ref="ledgerSigning"
              :transaction="transaction"
              @error="error"
              @signedTx="emitSignedTransaction"
            ></LedgerSigning>
          </v-flex>
        </v-layout>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" flat outline @click="close">Cancel</v-btn>
        <v-btn color="primary" v-if="!withLedger" @click="emitSignedTransaction(transaction)">Confirm</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import LedgerSigning from '@/components/Token/Fat1Token/LedgerSigning.vue';
import Transaction from '@fat-token/fat-js/1/Transaction';
import { displayIds } from '@/components/Token/Fat1Token/nf-token-ids.js';

export default {
  components: { LedgerSigning },
  data() {
    return {
      withLedger: false,
      display: false,
      transaction: null
    };
  },
  computed: {
    output() {
      if (this.transaction) {
        for (let [address, tokens] of Object.entries(this.transaction.getOutputs())) {
          return { address, tokens };
        }
      }
      return null;
    },
    outputAddress() {
      if (this.output) {
        return this.output.address;
      }
      return '??';
    },
    selectedTokens() {
      if (this.output) {
        return this.output.tokens;
      }
      return [];
    },
    metadata() {
      if (this.transaction) {
        return this.transaction.getMetadata();
      }
      return null;
    }
  },
  methods: {
    show(transaction, withLedger) {
      if (
        !(transaction instanceof Transaction) ||
        Object.keys(transaction.getInputs()).length === 0 ||
        Object.keys(transaction.getOutputs()).length !== 1
      ) {
        throw new Error('FAT-1 miso transaction only expected in this dialog');
      }
      this.withLedger = withLedger;
      this.transaction = transaction;
      this.display = true;
      if (withLedger) {
        this.$refs.ledgerSigning.activate();
      } else {
        transaction.validateSignatures();
      }
    },
    close() {
      this.display = false;
      if (this.withLedger) {
        this.$refs.ledgerSigning.deactivate();
      }
    },
    error(e) {
      this.$emit('error', e);
      this.close();
    },
    emitSignedTransaction(tx) {
      this.$emit('confirmed', tx);
      this.close();
    }
  },
  filters: {
    displayIds
  }
};
</script>
