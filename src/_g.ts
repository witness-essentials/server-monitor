import * as dsteem from 'dsteem'

export let config = require('../configs/config.js').get()

export let client: dsteem.Client = new dsteem.Client(config.RPC_NODES[0], { timeout: 8 * 1000 }) //TESTNET: dsteem.Client.testnet({ timeout: 8 * 1000 })

export let properties = { total_vesting_fund: 0, total_vesting_shares: 0 }

export let delegations = []