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

import Config from './config';
import Store from './store';

import Images from './images';
import Lookup from './lookup';
import Processor from './processor';
import Transport from './transport';
import ScriptsLoader from './scriptsLoader';
import Web3 from './web3';

main();

function main () {
  const store = new Store();

  store.transport = new Transport(store);
  store.images = new Images(store);
  store.lookup = new Lookup(store);
  store.processor = new Processor(store);
  store.scriptsLoader = new ScriptsLoader(store);
  store.web3 = new Web3(store);

  chrome.runtime.onConnect.addListener(onConnectHandler);
  chrome.runtime.onMessage.addListener(onMessageHandler);

  function onConnectHandler (port) {
    if (port.name === 'secureApi') {
      port.onMessage.addListener(store.transport.attachListener(port));
      return;
    }

    if (port.name === 'barScripts') {
      port.onMessage.addListener(store.scriptsLoader.attachListener(port));
      return;
    }

    if (port.name === 'web3') {
      port.onMessage.addListener(store.web3.attachListener(port));
      return;
    }

    if (port.name === 'id') {
      port.onMessage.addListener(store.processor.attachListener(port));
      return;
    }

    throw new Error(`Unrecognized port: ${port.name}`);
  }

  function onMessageHandler (message = {}, sender, sendResponse) {
    const { action } = message;

    switch (action) {
      case 'isAugmentationEnabled':
        Config.get()
          .then((config) => {
            const { augmentationEnabled = true } = config;

            sendResponse(augmentationEnabled);
          });

        return true;

      case 'isIntegrationEnabled':
        Config.get()
          .then((config) => {
            const { integrationEnabled = true } = config;

            sendResponse(integrationEnabled);
          });

        return true;

      case 'getExtractions':
        chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
          const extractions = store.processor.getExtractions(tabs[0]);
          sendResponse(extractions);
        });

        return true;

      case 'reload':
        store.transport.close();
        chrome.runtime.onConnect.removeListener(onConnectHandler);
        chrome.runtime.onMessage.removeListener(onMessageHandler);

        setTimeout(() => {
          main();
        }, 500);

        return false;

      case 'getNodeStatus':
        sendResponse(store.transport.status);
        return true;

      case 'getNodeURL':
        sendResponse(store.transport.url);
        return true;

      case 'getChainName':
        store.transport.getChainName()
          .then((chainName) => {
            sendResponse(chainName);
          })
          .catch((error) => {
            console.error('getChainName', error);
            sendResponse(null);
          });

        return true;

      case 'clearCache':
        store.lookup.clearCache();
        return true;

      case 'getUI':
        Config.get()
          .then((config) => {
            sendResponse(config.UI);
          });

        return true;
    }
  }
}
