#!/usr/bin/env python3
"""Regenerate web/lib/contracts/abi.ts from Foundry artifacts. Run after `forge build`."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "contracts/out/MilestoneEscrow.sol/MilestoneEscrow.json"
OUT = ROOT / "web/lib/contracts/abi.ts"

ERC20 = [
    {
        "type": "function",
        "name": "approve",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "type": "function",
        "name": "allowance",
        "stateMutability": "view",
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "spender", "type": "address"},
        ],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "type": "function",
        "name": "balanceOf",
        "stateMutability": "view",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "type": "function",
        "name": "decimals",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint8"}],
    },
    {
        "type": "function",
        "name": "symbol",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "string"}],
    },
]


def main() -> None:
    abi = json.loads(ARTIFACT.read_text())["abi"]
    OUT.write_text(
        "// Auto-generated from contracts/out/MilestoneEscrow.sol/MilestoneEscrow.json\n"
        "// Regenerated after `forge build` in contracts/. Do not hand-edit the escrow ABI.\n\n"
        f"export const milestoneEscrowAbi = {json.dumps(abi, indent=2)} as const;\n\n"
        f"export const erc20Abi = {json.dumps(ERC20, indent=2)} as const;\n"
    )
    print(f"wrote {OUT} ({len(abi)} abi items)")


if __name__ == "__main__":
    main()
