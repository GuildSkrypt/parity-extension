// Copyright 2015, 2016 Parity Technologies (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

import Config, { DEFAULT_CONFIG } from './config';
import { TRANSPORT_UNINITIALIZED } from '../shared';

export default class Web3 {

  DAPPS = DEFAULT_CONFIG.DAPPS;

  constructor (store) {
    this.store = store;

    Config.get()
      .then((config) => {
        if (config.DAPPS) {
          this.DAPPS = config.DAPPS;
        }
      });
  }

  attachListener (port) {
    return (msg) => {
      const { id } = msg;

      this.web3Message(msg)
        .then((response) => {
          port.postMessage({
            id,
            err: null,
            payload: response,
            connected: true
          });
        })
        .catch((error) => {
          const err = error.message === 'Failed to fetch' ? TRANSPORT_UNINITIALIZED : error.message;

          port.postMessage({
            id,
            err,
            payload: null
          });
        });
    };
  }

  web3Message (msg) {
    const { payload, origin } = msg;

    return fetch(
      `http://${this.DAPPS}/rpc/`,
      {
        method: 'POST',
        mode: 'cors',
        headers: new Headers({
          'Content-Type': 'application/json',
          'X-Parity-Origin': origin
        }),
        body: JSON.stringify(payload),
        redirect: 'error',
        referrerPolicy: 'origin'
      }
    ).then((response) => response.json());
  }

}
