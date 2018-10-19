import * as essentials from 'witness-essentials-package'
import * as dsteem from 'dsteem'
import * as _ from 'lodash'

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
    if (port > 0) {
      tcping.probe(String(ip), port, (e, b) => {
        if (e) {
          resolve(false)
        }
        resolve(b)
      })
    } else {
      ping.sys.probe(String(ip), (b) => {
        resolve(b)
      }, { timeout: 15 }) // seconds
    }
  })
}

export async function get_delegations() {
  _g.delegations = []

  // DIRECT DELEGATIONS
  let delegations = await _g.client.call('condenser_api', 'get_vesting_delegations', [_g.config.WITNESS, -1, 1000])
  delegations = delegations.filter(x => _g.config.DELEGATIONS_BLACKLIST.indexOf(x.delegatee) === -1)
  for (let x of delegations) {
    let effective_vesting_shares = parseFloat(x.vesting_shares.replace(' VESTS', ''))
    let steempower = _g.properties.total_vesting_fund * (effective_vesting_shares / _g.properties.total_vesting_shares)
    _g.delegations.push({ delegatee: x.delegatee, steempower })
  }

  // INDIRECT DELEGATIONS
  for (let y of _g.config.DELEGATIONS) {
    let delegations = await _g.client.call('condenser_api', 'get_vesting_delegations', [y.delegator, -1, 1000])
    delegations = delegations.filter(del => del.delegatee === y.delegatee)
    for (let z of delegations) {
      let effective_vesting_shares = parseFloat(z.vesting_shares.replace(' VESTS', ''))
      let steempower = _g.properties.total_vesting_fund * (effective_vesting_shares / _g.properties.total_vesting_shares)
      for (let g_del of _g.delegations) {
        if (g_del.delegatee === y.delegatee) {
          let i = _g.delegations.indexOf(g_del)
          _g.delegations[i].steempower += steempower
        }
      }
    }
  }

  _g.delegations = _.orderBy(_g.delegations, ['steempower'], ['desc'])
}