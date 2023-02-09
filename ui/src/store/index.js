import Vue from 'vue'
import Vuex from 'vuex'
import Axios from 'axios'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    servers: {},
    users: {}
  },
  mutations: {
    loadServer(state, server) {
      if(server && server.id) {
        state.servers = { ... state.servers, ...{[server.id]: server}}
      }
    },
    removeServer(state, id) {
      let servers = state.servers;
      delete servers[id]
      state.servers = servers
    },
    updateServer(state, server) {
      if(!server || !server.id) return;
      if(state.servers[server.id]) {
        state.servers = { ... state.servers, ...{[server.id]: server}}
      }
    },
    saveServers(state) {
      let stored = {}
      for(const key in state.servers) {
        const server = state.servers[key];
        if(!server.name || !server.address) return console.warn('Disregarding invalid server for saving: ' + key)
        stored[key] = {
          name: server.name,
          address: server.address,
          jwt: server.jwt
        }
      }
      window.localStorage.setItem('blender_servers', JSON.stringify(stored))
    },
    loginUser(state, { user, serverid, jwt}) {
      if(jwt) state.servers[serverid].jwt = jwt;
      state.users[serverid] = user;
    }
  },
  actions: {
    loadServers({commit, dispatch}) {
      const storedServers = window.localStorage.getItem('blender_servers');
      const userCache = window.sessionStorage.getItem('blender_userCache');
      if(storedServers) {
        const json = JSON.parse(storedServers);
        for(const id in json) {
          json[id].id = id;
          commit('loadServer', json[id])
          dispatch('refreshStatus', json[id])
        }
      }
      if(userCache) {
        const userJson = JSON.parse(userCache);
        for(const server in userJson) {
          commit('loginUser', {
            serverid: server,
            user: userJson[server]
          })
        }
      }
    },
    refreshStatus(state, server) {
      if(!server) return;
      Axios.get(`${server.address}/api/render/status`)
      .then(response => {
        server.status = "online"
        server.data = {
            blend: response.data.render?.blend,
            active: response.data.active,
        }
        state.commit('updateServer', server)
      })
      .catch((err) => {
        if(err.response && err.response.status === 401) {
          server.status = 'logged-out'
        }else{
          if(err.message !== "Network Error")
            console.warn(`Server '${server.id}' status check failed:`, err.message)
          server.status = "offline"
        }
        state.commit('updateServer', server)
      })
    }
  },
  getters: {
    servers(state) {
      return state.servers;
    },
    getUser: (state) => (serverID) => {
      let user = state.users[serverID];
      user.permissionBits = user.permissions !== 99 ? dec2Bits(user.permissions) : [1,2,4,8,16,32,64,128,256]
      return user;
    }
  },
  modules: {

  }
})

//Converts a decimal number (ex: 7) into its bits (1 + 2 + 4)
function dec2Bits(dec) {
  const bin = dec.toString(2); //convert dec -> bin
  const rev = [...bin].reverse().join('') //reverse str. could implement backwards for loop but this worked.
  const numbers = [];
  for (let i = 0; i < bin.length; i++) {
      const char = rev.charAt(i);
      if (char === '1') {
          numbers.push(1 << i)
      }
  }
  return numbers;
}