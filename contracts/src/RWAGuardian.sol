// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RWAGuardian {
    struct Assessment {
        address wallet;
        uint256 sourceChainId;
        uint8 riskScore;
        bytes32 portfolioHash;
        bytes32 reportHash;
        string summary;
        uint256 timestamp;
        address reporter;
    }

    Assessment[] public assessments;

    event AssessmentPublished(
        uint256 indexed assessmentId,
        address indexed wallet,
        uint256 indexed sourceChainId,
        uint8 riskScore,
        bytes32 portfolioHash,
        bytes32 reportHash,
        address reporter,
        uint256 timestamp
    );

    function publishAssessment(
        address wallet,
        uint256 sourceChainId,
        uint8 riskScore,
        bytes32 portfolioHash,
        bytes32 reportHash,
        string calldata summary
    ) external returns (uint256 assessmentId) {
        require(wallet != address(0), "wallet=0");
        require(riskScore <= 100, "riskScore>100");
        require(portfolioHash != bytes32(0), "portfolioHash=0");
        require(reportHash != bytes32(0), "reportHash=0");

        assessments.push(Assessment({
            wallet: wallet,
            sourceChainId: sourceChainId,
            riskScore: riskScore,
            portfolioHash: portfolioHash,
            reportHash: reportHash,
            summary: summary,
            timestamp: block.timestamp,
            reporter: msg.sender
        }));

        assessmentId = assessments.length - 1;
        emit AssessmentPublished(assessmentId, wallet, sourceChainId, riskScore, portfolioHash, reportHash, msg.sender, block.timestamp);
    }

    function assessmentCount() external view returns (uint256) {
        return assessments.length;
    }
}
