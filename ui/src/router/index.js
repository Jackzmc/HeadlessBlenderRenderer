import Vue from 'vue'
import VueRouter from 'vue-router'
import ServerDash from '../views/ServerDash.vue'
import ServerPage from '../views/ServerPage.vue'

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
    //Check if user has a valid JWT
    
    if(localStorage.getItem('blender_jwt') == null) {
      return next({
          path: '/login',
          params: { nextUrl: to.fullPath }
      })
    }
    //Fetch the user
    const user = JSON.parse(localStorage.getItem('blender_user'))
    if(permLevel >= 2) {
      if(user.permissions >= 2) {
        next()
      }else{
        //tell client to login, unauthorized
        next({
          path: '/login',
          params: { nextUrl: to.fullPath, unauthorized: true }
        })
      }
    }else if(permLevel >= 0 && user.permissions >= 0) {
      next();
    }else{
      //No access
      next({
        path: '/login',
        params: { nextUrl: to.fullPath }
      })
    }
  }else{
    next()
  }
})

export default router
