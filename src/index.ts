require('dotenv').config()
import * as dsteem from 'dsteem'
import * as essentials from 'witness-essentials-package'

import * as _ from 'lodash'
const _g = require('./_g')

import { get_account, get_witness, is_node_alive, get_delegations } from './helpers'
export let config = require('../configs/config.js').get()

let start = async () => {
  try {
    await update_delegations()
    console.log('\n' + '----------------------------' + '\n')
    console.log('Starting Server Monitor')
    console.log(`Tracking Delegations: ${_g.config.ENABLE_DELEGATIONS ? 'ENABLED': 'DISABLED' }`)
    console.log('\n' + '----------------------------' + '\n')
    while (true) {
      await essentials.timeout(5)
      await main()
      await essentials.timeout(_g.config.INTERVAL * 60)
      run_upate_delegations()
    }
  } catch (error) {
    console.error('start', error)
    await essentials.timeout(5)
    start()
  }
}

let run_upate_delegations = async () => {
  try {
    while (true) {
      await update_delegations()
      await essentials.timeout(60 * 60)
    }
  } catch (error) {
    console.error('update_properties', error)
  }
}

let update_delegations = async () => {
  if(!_g.config.ENABLE_DELEGATIONS) return
  let properties = await _g.client.call('condenser_api', 'get_dynamic_global_properties')
  _g.properties.total_vesting_fund = parseFloat(properties.total_vesting_fund_steem.replace(' VESTS', ''))
  _g.properties.total_vesting_shares = parseFloat(properties.total_vesting_shares.replace(' VESTS', ''))
  await get_delegations()
}

let main = async () => {
  //let witness = await get_witness(config.WITNESS)
  let account = await get_account(config.WITNESS)
  let metadata = JSON.parse(account.json_metadata)

  let witness_data = metadata.witness || {
    nodes: [],
    last_update_time: Date.now(),
    delegations: []
  }

  let new_witness_data = {
    nodes: [],
    last_update_time: 0,
    delegations: !_g.delegations || _g.delegations.length <= 0 || !_g.config.ENABLE_DELEGATIONS ? witness_data.delegations || [] : _g.delegations
  }

  for (let node of config.NODES) {
    let is_alive = await is_node_alive(node.IP, node.PORT)
    new_witness_data.nodes.push({
      id: Number(node.ID),
      type: node.TYPE,
      alive: is_alive
    })
  }

  new_witness_data.last_update_time = Date.now()
  let interval_update = (new_witness_data.last_update_time - witness_data.last_update_time) / (1000 * 60 * 60 * 24) >= 1 // Last update is older than 1 day
  if (!_.isEqual(new_witness_data.nodes, witness_data.nodes) || interval_update) {
    metadata.witness = new_witness_data
    await _g.client.broadcast.updateAccount({ account: config.WITNESS, memo_key: account.memo_key, json_metadata: JSON.stringify(metadata) }, dsteem.PrivateKey.fromString(process.env.ACTIVE_KEY))
    essentials.log(`Updated data`)
  }
}

start()
