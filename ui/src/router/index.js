import Vue from 'vue'
import VueRouter from 'vue-router'
import ServerDash from '../views/ServerDash.vue'
import ServerPage from '../views/ServerPage.vue'

import store from '../store'

Vue.use(VueRouter)

const routes = [
  {
    path: '/server/:server/admin',
    component: () => import(/* webpackChunkName: 'admin' */'../views/Admin.vue'),
    name: "Server Control Panel",
    meta: {
      permLevel: 2 //0 -> restricted (view status only), 1-> normal user, 2-> admin
    }
  },
  {
    path: '/server/:server',
    name: 'RenderPage',
    component: ServerPage,
    meta: {
      permLevel: 0 //0 -> restricted (view status only), 1-> normal user, 2-> admin
    },
  },
  {
    path: '/login/:server',
    name: 'Login',
    component: () => import(/* webpackChunkName: 'login' */'../views/Login.vue')
  },
  {
    path: '*',
    name: 'ServerDash',
    component: ServerDash,
  },
]


const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
  linkActiveClass: "is-active"
})

router.beforeEach((to, from, next) => {
  if(to.meta.permLevel !== null && to.meta.permLevel !== undefined && to.path !== "/login") {
    const permLevel = to.meta.permLevel
    const serverid = to.params.server;
    const jwt = store.state.servers[serverid] ? store.state.servers[serverid].jwt : null;
    //Check if user has a valid JWT
    if(!jwt) {
      return next({
          path: '/login/' + to.params.server,
          query: { redirect: to.fullPath, ret: 6 }
      })
    }
    //Fetch the user
    const user = store.state.users[serverid];
    if(user) {
      if(permLevel >= 2) {
        if(user.permissions >= 2) {
          next()
        }else{
          //tell client to login, unauthorized
          next({
            path: '/login/' + to.params.server,
            query: { redirect: to.fullPath, unauthorized: true, ret: 0  }
          })
        }
      }else if(permLevel >= 0 && user.permissions >= 0) {
        next();
      }else{
        //No access
        next({
          path: '/login/' + to.params.server,
          query: { redirect: to.fullPath, ret: 1 }
        })
      }
    }else{
      //try login
      next({
        path: '/login/' + to.params.server,
        query: { redirect: to.fullPath, ret: 2  }
      })
    }
  }else{
    next()
  }
})

export default router
