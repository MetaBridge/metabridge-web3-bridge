WEB3READY = false;

function logError(e, data) {
  // Use this to report back to us about issues
  console.log(e, data)
}

function log(data) {
  // Use this to report back to us logs
  console.log(data)
}

class NewWeb3Object {

  constructor() {
    this.web3 = null;
    this.currentWallet = "";
    this.etherscanAPI = "";
    this.contracts = {
      tokens: {},
      nfts: {},
    };
  }

  saveSelf() {
    sessionStorage.setItem('metabridge-web3-bridge', this);
  }

  saveWeb3(web3Obj) {
    window.wrappedWeb3.web3 = web3Obj;
  }

  getNFTs() {
    try {
      return window.wrappedWeb3.contracts.nfts;
    } catch (e) {
      logError(e, "Failed to get NFT's")
      return {}
    }
  }

  getTokens() {
    try {
      return window.wrappedWeb3.contracts.tokens;
    } catch (e) {
      logError(e, "Failed to get NFT's")
      return {}
    }
  }

  /**
   * Add etherscan API to this object
   *
   * @param   {string}  apiKey  The API key for etherscan.
   *
   * @return  {bool}            Indication of success or failure.
   */
  addEtherscanAPI(apiKey) {
    try {
      window.wrappedWeb3.etherscanAPI = apikey;
      return true;
    } catch (e) {
      logError(e, "Failed to get NFT's");
      return false;
    }
  }

  /**
   * Connect to Users wallet
   *
   * @return  {bool}            Indication of success or failure.
   */
  async connectWallet() {
    try {
      let wallets = await window.ethereum.enable();
      if (wallets.length > 0) {
        window.wrappedWeb3.currentWallet = wallets[0];
      }

      console.log(window.wrappedWeb3.currentWallet);
      return true;
    } catch (e) {
      logError(e, "Failed to connect to User's wallet");
      return false;
    }
  }

  /**
   * Check if wallet is connected
   *
   * @return  {bool}            Indication of success or failure.
   */
  isConnected() {
    try {
      if (window.wrappedWeb3.currentWallet != "") {
        return true;
      }
      return false;
    } catch (e) {
      logError(e, "Failed to connect to User's wallet");
      return false;
    }
  }

  /**
   * Add a new token to the list
   *
   * @param   {string}  tokenName    The name of the token stored
   * @param   {string}  tokenType    The type of token required. ex nft, token
   * @param   {string}  tokenAddress The contractAddress for the token.
   * @param   {array}   abi          The ABI json for the token.
   *
   * @return  {bool}                 Indication of success or failure.
   */
  async newContract(tokenName, tokenType, tokenAddress, abi=[]) {
    try {
      // const tokenContract = window.wrappedWeb3.web3.eth.Contract(abi, tokenAddress);
      const newToken = new window.wrappedWeb3.web3.eth.Contract(abi, tokenAddress);
      // const newToken = tokenContract.at(tokenAddress);
      switch (tokenType.toLowerCase()) {
        case 'nft':
          window.wrappedWeb3.contracts.nfts[tokenName.toLowerCase()] = newToken;
          window.wrappedWeb3.saveSelf();
          return true;
        case 'token':
          window.wrappedWeb3.contracts.tokens[tokenName.toLowerCase()] = newToken;
          window.wrappedWeb3.saveSelf();
          return true;
        default:
          window.wrappedWeb3.logError('MB-ERROR',
            ['The tokenType given is not supported.', tokenType]);
          return false;
      }
    } catch (e) {
      logError(e, "Failed to get the new contract")
      return false;
    }
  }

  /**
   * Mint a token or an NFT.
   *
   * @param   {string}  tokenName    The name of the token stored.
   * @param   {string}  tokenType    The type of token required. ex nft, token
   * @param   {int}     mintAmount   The amount of the token to mint.
   * @param   {dict}    parameters   Other parameters to use for the mint function.
   *    Accepted parameters are mintName:string, mintFee:string
   *
   * @return  {object}               Response Object from metamask.
   */
  async mint(tokenName, tokenType, mintAmount = 1, parameters={}) {
    let tokenToMint = null;
    let mintFunctionName = parameters.get('mintName', 'mint');
    const mintFee = parameters.get('mintFee', null);
    const paramsToSend = {from: window.wrappedWeb3.currentAccount};

    if ('mintName' in parameters) mintFunctionName = parameters.mintName;
    if ('mintFee' in parameters) paramsToSend.value = parameters.mintFee;

    switch (tokenType.toLowerCase()) {
      case 'nft':
        tokenToMint = window.wrappedWeb3.getNFTs().get(tokenName.toLowerCase(), null);
        break;
      case 'token':
        tokenToMint = window.wrappedWeb3.getTokens().get(tokenName.toLowerCase(), null);
        break;
      default:
        return window.wrappedWeb3.logError('MB-ERROR',
          ['The tokenType given is not supported.', tokenType]);
    }

    if (tokenToMint == null) {
    	return window.wrappedWeb3.logError('MB-ERROR', ['The tokenName is not found.', tokenName]);
    }

    try {
      const response = await tokenToMint.token[mintFunctionName](mintAmount)
        .send(paramsToSend);
      window.wrappedWeb3.log(response);
      return response;
    } catch (e) {
      return window.wrappedWeb3.logError(e, 'Failed to mint the token.');
    }
  }

  /**
   * Run a token function
   *
   * @param   {string}  tokenName    The name of the token stored.
   * @param   {string}  tokenType    The type of token required. ex nft, token
   * @param   {string}  functionName The name of the function to call
   * @param   {array}   fields       The field values to add.
   * @param   {dict}    parameters   Other parameters to use for the function.
   *
   * @return  {object}               The response object will be returned.
   */
  async runFunction(tokenName, tokenType, functionName, fields=[], parameters={}) {
    if (!("from" in parameters)) {
      parameters.from = window.wrappedWeb3.currentAccount;
    }

    let tokenToInteract = null;

    switch (tokenType.toLowerCase()) {
      case 'nft':
        tokenToInteract = window.wrappedWeb3.getNFTs().get(tokenName.toLowerCase(), null);
        break;
      case 'token':
        tokenToInteract = window.wrappedWeb3.getTokens().get(tokenName.toLowerCase(), null);
        break;
      default:
        window.wrappedWeb3.logError('MB-ERROR',
          ['The tokenType given is not supported.', tokenType]);
        return {}
    }

    try {
      const response = await tokenToInteract.token[functionName](...fields)
        .send(parameters);
      window.wrappedWeb3.log(response);
      return response;
    } catch (e) {
      return window.wrappedWeb3.logError(e, 'Failed to mint the token.');
    }
  }

  /**
   * Get the token address.
   *
   * @param   {string}  tokenAddress  The contract address.
   *
   * @return  {object}                An array of the contract ABI.
   */
  async getABI(tokenAddress) {
    const url = "https://api.etherscan.io/api?module=contract&"+
      "action=getsourcecode&address={"+tokenAddress+"}&apikey="+
      window.wrappedWeb3.etherscanAPI;
    const response = await fetch(url);
    const data = await response.json();
    try {
      return data["result"][0]["ABI"];
    } catch (e) {
      return []
    }
  }
}
class NewLoadAll {
  constructor() {

  }

  load() {
    console.log("In Load All")
    // Load web3
    if (typeof web3 !== 'undefined') {
      window.web3 = new Web3(web3.currentProvider);
      // wrappedWeb3.saveWeb3(window.web3);
      WEB3READY = true;
      try {
        LOADPAGE();
      } catch (e) {
        console.log("No LOADPAGE function.");
      }
    } else {
      if (EXTERNALPROVIDER != undefined) {
        window.web3 = new Web3(new Web3.providers.HttpProvider(EXTERNALPROVIDER));
        // wrappedWeb3.saveWeb3(window.web3);
        WEB3READY = true;
        try {
          LOADPAGE();
        } catch (e) {
          console.log("No LOADPAGE function.");
        }
      }
      console.warn("Web3 is not available." +
        "No injected web3 nor EXTERNALPROVIDER provided.")
    }
  }
}

var wrappedWeb3 = null;
var loadAll = null;
const savedWeb3 = sessionStorage.getItem('metabridge-web3-bridge');
if (savedWeb3) {
  wrappedWeb3 = savedWeb3;
} else {
  wrappedWeb3 = new NewWeb3Object();
}

loadAll = new NewLoadAll();

window.addEventListener('load', function() {
  if (WEB3READY != true) {
    window.loadAll.load()
  }
})
