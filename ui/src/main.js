import Vue from 'vue'
import App from './App.vue'
import Buefy from 'buefy'
import 'buefy/dist/buefy.css'
import '@mdi/font/css/materialdesignicons.css'

import { version } from '../package.json'
import router from './router'
import Axios from 'axios'
import store from './store'


Vue.use(Buefy)
Vue.config.productionTip = false
Vue.config.devtools = true
Vue.prototype.$VERSION = version;
Vue.prototype.$http = Axios;
Vue.prototype.$NODE_ENV = process.env.NODE_ENV

store.dispatch('loadServers')

Vue.filter('humanize', (b,defaultText) => {
  if(b === null || b === undefined) return defaultText||'?'
  const s=1024;
  let u = 0
  while (b >= s || -b >= s) {
      b /= s;
      u++;
  }
  return (u ? b.toFixed(1) + ' ' : b) + ' KMGTPEZY'[u] + 'B';
})

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
