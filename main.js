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
    this.web3 = web3Obj;
  }

  getNFTs() {
    try {
      return this.contracts.nfts;
    } catch (e) {
      logError(e, "Failed to get NFT's")
      return {}
    }
  }

  getTokens() {
    try {
      return this.contracts.tokens;
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
      this.etherscanAPI = apikey;
      return true;
    } catch (e) {
      logError(e, "Failed to get NFT's");
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
      const tokenContract = this.web3.eth.contract(abi);
      const newToken = tokenContract.at(tokenAddress);
      switch (tokenType.toLowerCase()) {
        case 'nft':
          this.contracts.nfts[tokenName.toLowerCase()] = newToken;
          this.saveSelf();
          return true;
        case 'token':
          this.contracts.tokens[tokenName.toLowerCase()] = newToken;
          this.saveSelf();
          return true;
        default:
          this.logError('MB-ERROR',
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
    const paramsToSend = {from: this.currentAccount};

    if ('mintName' in parameters) mintFunctionName = parameters.mintName;
    if ('mintFee' in parameters) paramsToSend.value = parameters.mintFee;

    switch (tokenType.toLowerCase()) {
      case 'nft':
        tokenToMint = this.getNFTs().get(tokenName.toLowerCase(), null);
        break;
      case 'token':
        tokenToMint = this.getTokens().get(tokenName.toLowerCase(), null);
        break;
      default:
        return this.logError('MB-ERROR',
          ['The tokenType given is not supported.', tokenType]);
    }

    if (tokenToMint == null) {
    	return this.logError('MB-ERROR', ['The tokenName is not found.', tokenName]);
    }

    try {
      const response = await tokenToMint.token[mintFunctionName](mintAmount)
        .send(paramsToSend);
      this.log(response);
      return response;
    } catch (e) {
      return this.logError(e, 'Failed to mint the token.');
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
      parameters.from = this.currentAccount;
    }

    let tokenToInteract = null;

    switch (tokenType.toLowerCase()) {
      case 'nft':
        tokenToInteract = this.getNFTs().get(tokenName.toLowerCase(), null);
        break;
      case 'token':
        tokenToInteract = this.getTokens().get(tokenName.toLowerCase(), null);
        break;
      default:
        this.logError('MB-ERROR',
          ['The tokenType given is not supported.', tokenType]);
        return {}
    }

    try {
      const response = await tokenToInteract.token[functionName](...fields)
        .send(parameters);
      this.log(response);
      return response;
    } catch (e) {
      return this.logError(e, 'Failed to mint the token.');
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
      this.etherscanAPI;
    const response = await fetch(url);
    const data = await response.json();
    try {
      return data["result"][0]["ABI"];
    } catch (e) {
      return []
    }
  }
}

var wrappedWeb3 = null;
const savedWeb3 = sessionStorage.getItem('metabridge-web3-bridge');
console.log("SAVED", savedWeb3)
if (savedWeb3) {
  wrappedWeb3 = savedWeb3;
} else {
  wrappedWeb3 = new NewWeb3Object();
}

window.addEventListener('load', function() {
  // Load web3
  if (typeof web3 !== 'undefined') {
    window.web3 = new Web3(web3.currentProvider);
    wrappedWeb3.saveWeb3(window.web3);
    WEB3READY = true;
    try {
      LOADPAGE();
    } catch (e) {
      console.log("No LOADPAGE function.");
    }
  } else {
    if (EXTERNALPROVIDER != undefined) {
      window.web3 = new Web3(new Web3.providers.HttpProvider(EXTERNALPROVIDER));
      wrappedWeb3.saveWeb3(window.web3);
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
})
