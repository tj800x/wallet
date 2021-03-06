<template>
  <v-dialog v-model="display" lazy max-width="600px" @keydown.esc="display = false">
    <v-card>
      <v-form @submit.prevent="generateBackupFile">
        <v-card-title class="headline primary white--text" primary-title>Backup File</v-card-title>
        <v-card-text>
          <v-layout wrap>
            <v-flex xs12 mb-4>
              <p class="subheading">
                The backup file is encrypted with your wallet password. You will need to remember the password to
                restore your wallet from this backup file.
              </p>
            </v-flex>
            <v-flex xs12 text-xs-center>
              <v-text-field
                v-model="password"
                ref="password"
                :append-icon="displayPassword ? 'visibility_off' : 'visibility'"
                :type="displayPassword ? 'text' : 'password'"
                @click:append="displayPassword = !displayPassword"
                label="Wallet Password"
                :error-messages="errorMessages"
                @input="errorMessages = []"
                autofocus
                box
              ></v-text-field>
            </v-flex>
          </v-layout>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" type="submit">Generate Encrypted Backup File</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script>
const { dialog } = require('electron').remote;
const { writeFile } = require('fs');
import BackupCypher from '@/lib/BackupCypher';

const BACKUP_CYPHER = new BackupCypher();

export default {
  data: function() {
    return {
      password: '',
      displayPassword: false,
      errorMessages: [],
      display: false
    };
  },
  methods: {
    show() {
      this.display = true;
      if (this.$refs.password) {
        this.$nextTick(this.$refs.password.focus);
      }
    },
    async generateBackupFile() {
      if (!this.validatePassword()) {
        return;
      }

      try {
        const backup = await this.$store.dispatch('backup');
        const data = JSON.stringify(BACKUP_CYPHER.cypherBackup(backup, this.password));
        this.display = false;

        const result = await dialog.showSaveDialog({ defaultPath: 'fat-wallet.backup.json' });
        if (!result.canceled && result.filePath) {
          this.writeBackupFile(data, result.filePath);
        }
      } catch (e) {
        this.$store.commit('snackError', e.message);
      }
    },
    validatePassword() {
      if (this.password === '') {
        this.errorMessages = ['Incorrect password'];
        return false;
      }

      try {
        this.$store.state.keystore.store.getMnemonic(this.password);
        return true;
      } catch (e) {
        if (e.message.includes('Decryption failed')) {
          this.errorMessages = ['Incorrect password'];
        } else {
          this.$store.commit('snackError', e.message);
        }
      }
    },
    async writeBackupFile(data, filename) {
      const store = this.$store;
      if (filename) {
        writeFile(filename, data, err => {
          if (err) {
            store.commit('snackError', err.message);
          } else {
            store.commit('snackSuccess', `File saved at ${filename}`);
          }
        });
      }
    }
  },
  watch: {
    async display() {
      if (!this.display) {
        this.password = '';
      }
    }
  }
};
</script>
