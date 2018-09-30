import * as essentials from 'witness-essentials-package'
import * as dsteem from 'dsteem'
const _g = require('./_g')
var ping = require('ping')
var tcping = require('tcp-ping')
 
export interface Options {
  node?: string,
  retries?: number,
  set_properties?: boolean
}

export let update_witness = async (current_signing_key: string, transaction_signing_key: string, props: dsteem.utils.WitnessProps, options: Options = {}) => {
  try {
    if (!options.retries) options.retries = 0

    let client = _g.client
    if (options.node) client = new dsteem.Client(options.node, { timeout: 8 * 1000 })

    if (options.set_properties) {
      await essentials.witness_set_properties(client, _g.witness_data.witness, current_signing_key, props, transaction_signing_key)
    } else {
      await essentials.update_witness(client, current_signing_key, _g.witness_data, transaction_signing_key)
    }

  } catch (error) {
    console.error(error)
    if (options.retries < 2) {
      await essentials.timeout(1)
      options.retries += 1
      await update_witness(current_signing_key, transaction_signing_key, props, options)
    } else {
      failover()
      options.retries = 0
      await update_witness(current_signing_key, transaction_signing_key, props, options)
    }
  }
}

export let get_witness = async (witness: string, options: Options = { retries: 0 }) => {
  try {
    if (!options.retries) options.retries = 0

    let client = _g.client
    if (options.node) client = new dsteem.Client(options.node, { timeout: 8 * 1000 })

    return await essentials.get_witness_by_account(client, witness)
  } catch (error) {
    console.error(error)
    if (options.retries < 2) {
      await essentials.timeout(1)
      options.retries += 1
      await get_witness(witness, options)
    } else {
      failover()
      options.retries = 0
      await get_witness(witness, options)
    }
  }
}

export let get_account = async (name: string, options: Options = { retries: 0 }) => {
  try {
    if (!options.retries) options.retries = 0

    let client = _g.client
    if (options.node) client = new dsteem.Client(options.node, { timeout: 8 * 1000 })

    return (await client.database.getAccounts([name]))[0]
  } catch (error) {
    console.error(error)
    if (options.retries < 2) {
      await essentials.timeout(1)
      options.retries += 1
      await get_witness(name, options)
    } else {
      failover()
      options.retries = 0
      await get_witness(name, options)
    }
  }
}


export let failover = async () => {
  _g.current_node = essentials.failover_node(_g.config.RPC_NODES, _g.current_node)
  essentials.log(`Switched Node: ${_g.current_node}`)
  _g.client = new dsteem.Client(_g.current_node, { timeout: 8 * 1000 })
}

export let is_node_alive = async (ip, port = 0) => {
  return new Promise((resolve, reject) => {
    if(port > 0) {
      tcping.probe(String(ip), port, (e, b) => {
        if(e) {
          resolve(false)
        }
        resolve(b)
      })
    } else {
      ping.sys.probe(String(ip), (b) => {
        console.log(b)
        resolve(b)
      })
    }
    
  })
}