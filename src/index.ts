require('dotenv').config()
import * as dsteem from 'dsteem'
import * as essentials from 'witness-essentials-package'

import * as _ from 'lodash'
import * as _g from './_g'

import { get_account, get_witness, is_node_alive } from './helpers'
export let config = require('../configs/config.js').get()

let start = async () => {
  try {
    while (true) {
      await main()
      await essentials.timeout(_g.config.INTERVAL * 60)
    }
  } catch (error) {
    console.error('start', error)
    await essentials.timeout(5)
    start()
  }
}

let main = async () => {
  //let witness = await get_witness(config.WITNESS)
  let account = await get_account(config.WITNESS)
  let metadata = JSON.parse(account.json_metadata)
  let witness_data = metadata.witness || {
    nodes: [],
    last_update_time: Date.now()
  }
  let new_witness_data = {
    nodes: [],
    last_update_time: 0
  }
  for (let node of config.NODES) {
    let is_alive = await is_node_alive(node.IP, node.PORT)
    new_witness_data.nodes.push({
      id: node.ID,
      type: node.TYPE,
      alive: is_alive
    })
  }

  new_witness_data.last_update_time = Date.now()
  if (!_.isEqual(new_witness_data.nodes, witness_data.nodes)) {
    metadata.witness = new_witness_data
    await _g.client.broadcast.updateAccount({ account: config.WITNESS, memo_key: account.memo_key, json_metadata: JSON.stringify(metadata) }, dsteem.PrivateKey.fromString(process.env.ACTIVE_KEY) )
  }
}

start()
