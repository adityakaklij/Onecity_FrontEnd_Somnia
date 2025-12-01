

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const mint_nft_fun = async() => {

    const contractInstance = new ethers.Contract(ContractAddresss, ContractABI, signer);
    
    const submitProjectTx = await contractInstance.mint_nft('x_coordinate', 'y_coordinate', 'nft_url', "land_type")
 
    await submitProjectTx.wait();
    window.alert("Project submitted successfully!");
  };


  const list_for_sale_fun = async() => {

    const contractInstance = new ethers.Contract(ContractAddresss, ContractABI, signer);
    
    const submitProjectTx = await contractInstance.submitProject('uint256 landId', 'uint256 price')
 
    await submitProjectTx.wait();
    window.alert("Project submitted successfully!");
  };

  const purchase_listed_nft_fun() = async() => {

    const contractInstance = new ethers.Contract(ContractAddresss, ContractABI, signer);
    
    const submitProjectTx = await contractInstance.purchase_listed_nft("uint256 landId")
 
    await submitProjectTx.wait();
    window.alert("Project submitted successfully!");
  };
  
  const apply_for_permit_fun() = async() => {

    const contractInstance = new ethers.Contract(ContractAddresss, ContractABI, signer);
    
    const submitProjectTx = await contractInstance.apply_for_votes("uint256 landId", "string description")
 
    await submitProjectTx.wait();
    window.alert("Project submitted successfully!");
  };
  const make_vote_fun() = async() => {

    const contractInstance = new ethers.Contract(ContractAddresss, ContractABI, signer);
    
    const submitProjectTx = await contractInstance.make_vote("uint256 proposalId", "bool support")
 
    await submitProjectTx.wait();
    window.alert("Project submitted successfully!");
  };
