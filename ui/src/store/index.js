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
      delete state.servers[id]
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
          if(Object.keys(json).length > 0) {
            for(const id in json) {
              json[id].id = id;
              commit('loadServer', json[id])
              dispatch('refreshStatus', json[id])
            }
          }else{
            const server = {
              id: 'local',
              name: 'Local Server',
              address: ''
            }
            commit('loadServer', server);
            dispatch('refreshStatus', server)
            commit('saveServers')
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
            blend: response.data.blend,
            active: response.data.active,
        }
        state.commit('updateServer', server)
      })
      .catch((err) => {
          console.warn(`Server '${server.id}' status check failed:`,err.message)
          server.status = (err.message == "Network Error") ? "error" : "offline"
          state.commit('updateServer', server)

      })
    }
  },
  getters: {
    servers(state) {
      return state.servers;
    }
  },
  modules: {

  }
})