// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * HealthConsent — on-chain access-control registry for health data sharing.
 *
 * What is stored on-chain:
 *   ✓  Patient wallet address (msg.sender — implicit)
 *   ✓  Doctor wallet address
 *   ✓  Access expiry timestamp (Unix seconds)
 *
 * What is NOT stored on-chain:
 *   ✗  Any health data
 *   ✗  Medical records
 *   ✗  Encrypted blobs
 *   ✗  PII beyond wallet addresses
 *
 * The encrypted health summary lives only in the patient's browser (IndexedDB).
 * The contract is purely an access-control signal that the frontend checks
 * before decrypting and displaying data to a doctor.
 *
 * Deployment:
 *   Compile with solc ^0.8.20 (or Hardhat / Foundry).
 *   Deploy to any EVM chain (mainnet, Polygon, Sepolia testnet, etc.).
 *   Set NEXT_PUBLIC_CONSENT_CONTRACT_ADDRESS in .env.local.
 *   Set NEXT_PUBLIC_CHAIN_ID to the target chain ID.
 */
contract HealthConsent {

    // patient => doctor => expiry timestamp (0 = no access)
    mapping(address => mapping(address => uint256)) private _accessExpiry;

    // ── Events ────────────────────────────────────────────────────────────────

    event AccessGranted(
        address indexed patient,
        address indexed doctor,
        uint256         expiry
    );

    event AccessRevoked(
        address indexed patient,
        address indexed doctor
    );

    // ── Patient actions ───────────────────────────────────────────────────────

    /**
     * Grant `doctor` access to the caller's data until `expiry` (Unix seconds).
     * Replaces any existing grant for the same doctor.
     */
    function grantAccess(address doctor, uint256 expiry) external {
        require(doctor != address(0),    "Invalid doctor address");
        require(expiry > block.timestamp, "Expiry must be in the future");
        _accessExpiry[msg.sender][doctor] = expiry;
        emit AccessGranted(msg.sender, doctor, expiry);
    }

    /**
     * Immediately revoke `doctor`'s access to the caller's data.
     */
    function revokeAccess(address doctor) external {
        require(_accessExpiry[msg.sender][doctor] != 0, "No active grant");
        _accessExpiry[msg.sender][doctor] = 0;
        emit AccessRevoked(msg.sender, doctor);
    }

    // ── Read-only queries ─────────────────────────────────────────────────────

    /**
     * Returns true if `doctor` currently has unexpired access to `patient`'s data.
     * Anyone can query this (public signal — no private health info is revealed).
     */
    function hasAccess(address patient, address doctor)
        external view returns (bool)
    {
        return _accessExpiry[patient][doctor] > block.timestamp;
    }

    /**
     * Returns the raw expiry timestamp for a patient/doctor pair.
     * Returns 0 if no grant exists or if it has already expired.
     */
    function getExpiry(address patient, address doctor)
        external view returns (uint256)
    {
        return _accessExpiry[patient][doctor];
    }
}
