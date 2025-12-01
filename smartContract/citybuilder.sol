// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CityBuilder 
/// @notice Handles land "NFTs", RTokens (points), marketplace, and voting in one place.
contract CityBuilder {
    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    // RToken logic
    uint256 public constant RTOKEN_REWARD_ON_MINT = 5_000; // reward when minting land
    uint256 public constant PERMIT_FEE             = 500;  // cost in RTokens to apply for a permit
    uint64  public constant MIN_UP_VOTES_REQUIRED  = 2;    // you can tweak / use in UI

    /*//////////////////////////////////////////////////////////////
                            LAND / "NFT" LOGIC
    //////////////////////////////////////////////////////////////*/

    struct Land {
        uint256 id;
        uint16  x;
        uint16  y;
        string  uri;
        address owner;
        uint8   landType;   // 11/12/13/14 (Agricultural/Residential/Commercial/Industrial)
        bool    exists;
    }

    // Incremental land id like NftCount.next_uid
    uint256 public nextLandId;

    // landId => Land details
    mapping(uint256 => Land) public lands;

    // keccak(x, y) => landId (used to prevent double-mint same coordinates)
    mapping(bytes32 => uint256) public landIdByCoordinates;

    // owner => list of land ids (for convenience)
    mapping(address => uint256[]) private _landsOfOwner;

    /*//////////////////////////////////////////////////////////////
                               RTOKEN POINTS
    //////////////////////////////////////////////////////////////*/

    // Simple points ledger: address => RToken balance
    mapping(address => uint256) public rtokenBalance;

    /*//////////////////////////////////////////////////////////////
                            MARKETPLACE LISTINGS
    //////////////////////////////////////////////////////////////*/

    struct Listing {
        uint256 landId;
        uint256 price;   // in RTokens
        address seller;
        bool    active;
    }

    // landId => Listing
    mapping(uint256 => Listing) public listings;

    /*//////////////////////////////////////////////////////////////
                            VOTING / PERMITS
    //////////////////////////////////////////////////////////////*/

    struct Proposal {
        uint256 id;
        uint256 landId;
        address owner;       // land owner who created the proposal
        string  description;
        uint64  upVotes;
        uint64  downVotes;
        bool    isApproved;  // updated based on votes
        bool    exists;
    }

    uint256 public nextProposalId;
    mapping(uint256 => Proposal) public proposals;

    // proposalId => voter => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /*//////////////////////////////////////////////////////////////
                                   EVENTS
    //////////////////////////////////////////////////////////////*/

    // Land / NFT
    event LandMinted(uint256 indexed landId, address indexed owner, uint16 x, uint16 y, string uri, uint8 landType);
    event LandTransferred(uint256 indexed landId, address indexed from, address indexed to);

    // RTokens
    event RTokensMinted(address indexed to, uint256 amount);
    event RTokensTransferred(address indexed from, address indexed to, uint256 amount);

    // Marketplace
    event LandListed(uint256 indexed landId, uint256 price, address indexed seller);
    event LandDelisted(uint256 indexed landId);
    event LandPurchased(uint256 indexed landId, address indexed seller, address indexed buyer, uint256 price);

    // Governance
    event ProposalCreated(uint256 indexed proposalId, uint256 indexed landId, address indexed owner, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalApproved(uint256 indexed proposalId);

    /*//////////////////////////////////////////////////////////////
                                 MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier landExists(uint256 landId) {
        require(lands[landId].exists, "Land: does not exist");
        _;
    }

    modifier onlyLandOwner(uint256 landId) {
        require(lands[landId].owner == msg.sender, "Land: not owner");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL HELPER LOGIC
    //////////////////////////////////////////////////////////////*/

    function _coordKey(uint16 x, uint16 y) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(x, y));
    }

    function _addLandToOwner(address _owner, uint256 landId) internal {
        _landsOfOwner[_owner].push(landId);
    }

    function _removeLandFromOwner(address _owner, uint256 landId) internal {
        uint256[] storage arr = _landsOfOwner[_owner];
        uint256 len = arr.length;
        for (uint256 i = 0; i < len; i++) {
            if (arr[i] == landId) {
                arr[i] = arr[len - 1];
                arr.pop();
                break;
            }
        }
    }

    function _transferLand(
        uint256 landId,
        address from,
        address to
    ) internal {
        lands[landId].owner = to;
        _removeLandFromOwner(from, landId);
        _addLandToOwner(to, landId);
        emit LandTransferred(landId, from, to);
    }

    function _mintRTokens(address to, uint256 amount) internal {
        rtokenBalance[to] += amount;
        emit RTokensMinted(to, amount);
    }

    function _transferRTokens(address from, address to, uint256 amount) internal {
        uint256 fromBal = rtokenBalance[from];
        require(fromBal >= amount, "RToken: insufficient balance");
        unchecked {
            rtokenBalance[from] = fromBal - amount;
        }
        rtokenBalance[to] += amount;
        emit RTokensTransferred(from, to, amount);
    }

    /*//////////////////////////////////////////////////////////////
                               CORE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Mint a new land "NFT"
    function mint_nft(
        uint16 x,
        uint16 y,
        string calldata uri,
        uint8 landType
    ) external {
        bytes32 key = _coordKey(x, y);
        require(landIdByCoordinates[key] == 0, "Land: already minted at coords");

        uint256 newId = ++nextLandId;

        lands[newId] = Land({
            id: newId,
            x: x,
            y: y,
            uri: uri,
            owner: msg.sender,
            landType: landType,
            exists: true
        });

        landIdByCoordinates[key] = newId;
        _addLandToOwner(msg.sender, newId);

        _mintRTokens(msg.sender, RTOKEN_REWARD_ON_MINT);

        emit LandMinted(newId, msg.sender, x, y, uri, landType);
    }

    /// @notice List a land NFT for sale for a given RToken price
    function list_for_sale(uint256 landId, uint256 price)
        external
        landExists(landId)
        onlyLandOwner(landId)
    {
        require(price > 0, "Listing: invalid price");

        listings[landId] = Listing({
            landId: landId,
            price: price,
            seller: msg.sender,
            active: true
        });

        emit LandListed(landId, price, msg.sender);
    }

    /// @notice Delist a land from sale (nice to have)
    function delist(uint256 landId)
        external
        landExists(landId)
        onlyLandOwner(landId)
    {
        Listing storage lst = listings[landId];
        require(lst.active, "Listing: not active");
        lst.active = false;
        emit LandDelisted(landId);
    }

    /// @notice Purchase a listed land using RTokens (points)
    function purchase_listed_nft(uint256 landId) external landExists(landId) {
        Listing storage lst = listings[landId];
        require(lst.active, "Listing: not active");

        address seller = lst.seller;
        uint256 price  = lst.price;

        require(seller != address(0), "Listing: invalid seller");
        require(msg.sender != seller, "Listing: cannot buy your own land");

        // Transfer RTokens buyer -> seller
        _transferRTokens(msg.sender, seller, price);

        // Transfer land ownership
        _transferLand(landId, seller, msg.sender);

        // Close listing
        lst.active = false;

        emit LandPurchased(landId, seller, msg.sender, price);
    }

    /*//////////////////////////////////////////////////////////////
                           GOVERNANCE / VOTING
    //////////////////////////////////////////////////////////////*/

    /// @notice Apply for a "permit" / proposal on a land (requires RTokens as fee)
    function apply_for_votes(
        uint256 landId,
        string calldata description
    ) external landExists(landId) onlyLandOwner(landId) {
        // Deduct permit fee and burn it (send to address(0) logically)
        _transferRTokens(msg.sender, address(0), PERMIT_FEE);

        uint256 proposalId = ++nextProposalId;

        proposals[proposalId] = Proposal({
            id: proposalId,
            landId: landId,
            owner: msg.sender,
            description: description,
            upVotes: 0,
            downVotes: 0,
            isApproved: false,
            exists: true
        });

        emit ProposalCreated(proposalId, landId, msg.sender, description);
    }

    /// @notice Cast a vote on a proposal
    /// @param proposalId ID of proposal
    /// @param support true = upVote, false = downVote
    function make_vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(p.exists, "Proposal: does not exist");
        require(p.owner != msg.sender, "Proposal: owner cannot vote");
        require(!hasVoted[proposalId][msg.sender], "Proposal: already voted");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            p.upVotes += 1;
        } else {
            p.downVotes += 1;
        }

        emit Voted(proposalId, msg.sender, support);
    }

    /// @notice Update proposal approval status based on upVotes threshold
    /// @dev Anyone can call; it just checks the condition and updates.
    function update_proposal_status(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(p.exists, "Proposal: does not exist");
        require(!p.isApproved, "Proposal: already approved");

        if (p.upVotes >= MIN_UP_VOTES_REQUIRED) {
            p.isApproved = true;
            emit ProposalApproved(proposalId);
        }
    }

    /*//////////////////////////////////////////////////////////////
                              VIEW HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Get all lands owned by a user
    function landsOf(address _owner) external view returns (uint256[] memory) {
        return _landsOfOwner[_owner];
    }

    /// @notice Returns coordinates for a given land
    function get_land_coordinates(uint256 landId)
        external
        view
        landExists(landId)
        returns (uint16 x, uint16 y)
    {
        Land storage l = lands[landId];
        return (l.x, l.y);
    }

    /// @notice Returns URI (metadata / image URL) for a land
    function get_land_uri(uint256 landId)
        external
        view
        landExists(landId)
        returns (string memory)
    {
        return lands[landId].uri;
    }
}
