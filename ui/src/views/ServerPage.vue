<template>
  <div id="app">
    <b-navbar>
        <template slot="brand">
            <b-navbar-item tag="router-link" to="/">
                <h4 class="title is-4">Blender Render UI</h4>
            </b-navbar-item>
        </template>
        <template slot="start">
            <b-navbar-item tag="router-link" to="/">
                Servers Dashboard
            </b-navbar-item>
            <b-navbar-item tag="router-link" :to="'/server/' + server.id + '/admin'" v-if="user.permissionBits.includes(16)">
                Admin Panel
            </b-navbar-item>
        </template>
        <template slot="end">
            <b-navbar-item tag="div">
                <b-tooltip position="is-left" multilined>
                    <div class="tag"><b-icon icon="currency-usd-circle-outline" /><span>{{tokens}}</span></div>
                    <template v-slot:content>
                        <br>
                        The amount of render tokens you have. 
                        One token is 10 minutes of rendering.
                    </template>
                </b-tooltip>
            </b-navbar-item>
            <b-navbar-dropdown :label="user.username" right>
                <b-navbar-item @click="openUserSettings">
                    Settings
                </b-navbar-item>
                <b-navbar-item @click="openPermissionsModal">
                    Permissions
                </b-navbar-item>
                <hr class="dropdown-divider" aria-role="menuitem">
                <b-navbar-item @click="logout" class="has-text-danger">
                    Logout
                </b-navbar-item>
            </b-navbar-dropdown>
        </template>
    </b-navbar>
    <div class="container">
        <div class="columns">
            <div class="column is-5">
                <br>
                <br>
                <span>
                    <div v-if="render.active" class="notification is-dark">
                        <h6 class="title is-6">Rendering <span class="has-text-success">{{blend_file}}</span></h6>
                        <progress class="progress is-small renderprogress is-success" :value='render.current_frame' :max='render.max_frames'>{{framePercent}}</progress>
                        <p><strong>ETA: </strong>{{formatDuration(eta)}}</p>
                        <p><strong>Average time per frame: </strong>{{formatDuration(averageTimePerFrame)}}</p>
                        <br>
                        <nav class="level" > 
                        <!-- Left side -->
                            <div class="level-left">
                                <div class="level-item">
                                    <div class="buttons">
                                        <b-button type="is-danger" outlined @click="cancelRender()" :disabled="!hasPermission">
                                            Stop
                                        </b-button>
                                        <b-button v-if="!options.enable_socket" type="is-info" @click="getRenderStatus">
                                            <b-icon icon="refresh" />
                                        </b-button>
                                    </div>
                                </div>
                            </div>

                            <!-- Right side -->
                            <div class="level-right">
                                <p class="level-item">{{render.current_frame}}/{{this.render.max_frames}} frames complete</p>
                                <p class="level-item">{{framePercent}}%</p>
                            </div>
                        </nav>
                        
                    </div>
                    <b-field class="file">
                        <b-button :disabled="render.active" type="is-primary" @click="openBlendChooser" icon-left="blender-software">
                            <span>Choose a blend file</span>
                        </b-button>
                        <span class="file-name" v-if="blend_file">
                            {{ blend_file }}
                        </span>
                    </b-field>
                    <b-field label="Render Mode">
                        <b-checkbox :disabled="render.active" v-model="options.blend.use_gpu">
                            Rendering with {{options.blend.use_gpu? "GPU" : "CPU"}}
                        </b-checkbox>
                    </b-field>
                    <b-field label="Frame Options">
                        <b-checkbox :disabled="render.active" v-model="options.blend.frames.all">
                            Render all frames
                        </b-checkbox>
                    </b-field>
                    <div v-if="!options.blend.frames.all" class="columns">
                        <div class="column">
                            <b-field :disabled="render.active" label="Starting Frame">
                                <b-numberinput 
                                :min="0" 
                                :max="options.blend.frames.start" 
                                :disabled="options.blend.frames.all" 
                                controls-position="compact"
                                v-model="options.blend.frames.start"
                            />
                            </b-field>
                        </div>
                        <div class="column">
                            <b-field :disabled="render.active" label="Ending Frame">
                                <b-numberinput 
                                :min="options.blend.frames.start > 0? options.blend.frames.start : 0" 
                                :disabled="options.blend.frames.all" 
                                controls-position="compact"
                                v-model="options.blend.frames.end" 
                            />
                            </b-field>
                        </div>
                        <br>
                    </div>
                    <b-field label="Python Scripts (Optional)">
                        <b-taginput :disabled="render.active"
                            v-model="options.blend.python_scripts"
                            placeholder="Comma-separated list of files"
                            type="is-dark">
                        </b-taginput>
                    </b-field>
                    <b-field label="Extra Command Arguments (Optional)" v-if="serverSettings.extraShellArgs">
                        <b-input
                        v-model="options.blend.extra_arguments" 
                        disabled 
                        />
                    </b-field>
                    <br>
                </span>
                <div class="notification is-dark" v-if="!render.active">
                    <nav class="level" > 
                        <!-- Left side -->
                        <div class="level-left">
                            <div class="level-item">
                                <div class="buttons">
                                    <b-button :disabled="blend_file==null||!hasPermission" type="is-success" @click="startRender()">
                                        Start Render
                                    </b-button>
                                    <b-button v-if="!options.enable_socket" type="is-info" @click="getRenderStatus">
                                        <b-icon icon="refresh" />
                                    </b-button>
                                </div>
                            </div>
                        </div>

                        <!-- Right side -->
                        <div class="level-right">
                            <p class="level-item">{{renderStatus}}</p>
                        </div>
                    </nav>
                </div>
                <b-field>
                    <a @click="openZIPModal()" class="button is-large is-fullwidth is-info">
                        <b-icon icon="download"></b-icon>
                        <span>Download Renders</span>
                    </a>
                </b-field>
                <p>
                    <a class="has-text-weight-bold" href="https://github.com/Jackzmc/HeadlessBlenderRenderer">
                        HeadlessBlenderRenderer
                    </a> 
                    <span>UI v{{$VERSION}} </span><span v-if="server_version">| Server v{{server_version}}</span>
                </p>
            </div>
            <div class="column">
                <br>
                <p class="title is-3">Server: <span class="has-text-info">{{$route.params.server}}</span></p>
                <p class="subtitle is-5" v-html="socketStatus"></p>
                <b-field v-if="options.enable_socket" :label="consoleName" >
                  <div :class="['box',{'disconnected': isSocketOffline}]">
                    <VirtualList                    
                    style="height: 220px; overflow-y: auto;"
                    :data-key="'timestamp'"
                    :data-sources="render.logs"
                    :keeps="12"
                    ref="renderlog"
                    :data-component="$options.ListComponent"
                    />
                  </div>
                    <!--<b-input v-if="options.console.enabled" :disabled="isSocketOffline" id="el_renderlog" type="textarea" v-model="logString" readonly rows=10></b-input>-->
                </b-field>
                <span v-else>
                    <h5 class="title is-5">Socket has been disabled. Re-enable in settings to see console and statistics.</h5>
                    <br>
                </span>
                <nav class="level">
                    <div class="level-left">
                        <div class="buttons">
                            <b-button v-if="options.enable_socket" @click='render.logs = []' type="is-warning" ><b-icon icon='eraser'></b-icon></b-button>
                            <b-button v-if="options.enable_socket" @click='togglePause' type='is-info'>
                                <b-icon :icon="options.console.paused?'play':'pause'" />
                            </b-button>
                            <b-button @click="openSettingsModal" type="is-info" :size="options.enable_socket?'':'is-large'">
                                <b-icon icon="cog" :size="options.enable_socket?'':'is-large'"></b-icon>
                                <span v-if="!options.enable_socket">Settings</span>
                            </b-button>
                            <b-button v-if="options.console.paused&&options.enable_socket" disabled type="has-no-background">PAUSED</b-button>
                        </div>
                    </div>
                    <div class="level-right">
                        <b-tooltip label="View the last rendered frame">
                            <b-button v-if="render.current_frame > 0 && render.active" type="is-info" @click="openPreview">Preview</b-button>
                        </b-tooltip>
                    </div>
                </nav>
                
                <span v-if="options.enable_socket">
                    <span v-if="isSocketOffline">
                        <div v-if="isSocketOffline" class="notification is-danger">
                            Stats are disabled: Disconnected from socket server
                        </div>
                    </span>
                    <span v-else>
                    <!-- component handles the socket event, just needs settings -->
                    <Statistics :socket="socket" :version.sync="server_version" v-bind="options.stats" />
                    </span>
                </span>
            
            </div>
        </div>
        <br>
    </div>
  </div>
</template>

<script>
import Statistics from '../components/Statistics'
import ListComponent from '../components/ListComponent';
import Settings from '../components/modals/Settings'

import io from 'socket.io-client';
import VirtualList from 'vue-virtual-scroll-list'
import humanizeDuration from "humanize-duration";
import Axios from 'axios'

const AVG_TIME_PER_FRAME_VALUES = 20;
const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: "shortEn",
  languages: {
    shortEn: {
      ms: () => "ms",
    },
  },
});
export default {
  name: 'ServerPanel',
  ListComponent,
  components: {
    Statistics,
    VirtualList,
  },
  data() {
    return {
      socket: null, //Socket.io connection handle
      socket_first_inital: false, //if this is the first connection
      server_version: null,
      isSocketOffline: true,
      //STATES
      blend_file: null, //Choosen blend file
      render: {
        logs: [], //The list of logs, is computed into a joined string
        backlog: [], //The backlog of logs if paused
        active: false, //Is the render active
        current_frame: 0, //Current active render frame
        max_frames: 5, //Current active render's maximum frames,
        lastFrameDurations: [], //Cache last X frames to get AVG seconds/frame
        started: null,
        last_frame_time: null,
        eta: 0,
        averageTimerPerFrame: 0
      },
      //OPTIONS
      options: {
        enable_socket: true,
        blend: {
          use_gpu: true, //true -> gpu, false -> cpu
          frames: {
            all: true, //User chose to use all frames, or specify range?
            start: 0, //min frame range
            stop: 1 //max frame range
          },
          python_scripts: [], //tag list of python scripts to run in py_scripts folder
          extra_arguments: null //Any extra arguments as a string
        },
        stats: {
          use_celsius: true //true -> celsius shown, false -> fahrenheit
        },
        console: {
          paused: false, //Is the console paused (no new lines pushed?)
        }
      },
      serverSettings: {
        extraShellArgs: false,
        recordStats: true
      }
    }
  },
  computed: {
    server() {
        return this.$store.state.servers[this.$route.params.server];
    },
    user() {
        return this.$store.getters.getUser(this.$route.params.server)
    },
    baseURL() {
        return this.server.address;
    },
    consoleName() {
      return `Console Output (${this.render.logs.length} lines)`
    },
    hasPermission() {
        return this.user.permissionBits.includes(8)
    },
    tokens() {
        if(this.user.permissions === 99 || this.user.permissionBits.includes(255)) {
            return '∞'
        }else{
            return this.formatNumber(this.user.tokens)
        }
    },
    renderStatus() {
        if(this.hasPermission)
            return !this.blend_file ? 'Select a blend file to start' : 'Idle'
        else 
            return 'You lack permissions to start/stop renders.'
    },
    socketStatus() {
      return this.isSocketOffline ? `<span class='has-text-danger'>Disconnected from socket server</span>` : `<span class='has-text-success'>Connected to socket server</span>`
    },
    frameValue() {
        if(this.render.max_frames == null) return "- Frame #" + this.render.current_frame;
        return `()`;
    },
    framePercent() {
      if(this.render.max_frames == null) return "";
      if(!this.render.active) return 0;
      return (this.render.current_frame / this.render.max_frames * 100).toFixed(1)
    },
  },
  methods:{
    formatDuration(str) {
        if(str == -1) return "Calculating..."
        if(str <= 1000) return shortEnglishHumanizer(str, { units: ['s', 'ms'], round: true})
        return humanizeDuration(str, {largest: 2, maxDecimalPoints: 1})
    },
    togglePause() {
        //if currently paused, to be resumed, fill backlog
        if(this.options.console.paused) {
          if(this.render.backlog.length > 0 ) {
            this.render.logs.push({text:"Console unpaused, filling with backlog", timestamp:Date.now()})
            this.render.logs.push({text:"", timestamp:Date.now()+1})
            this.render.logs.splice(0, this.render.backlog.length)
            this.render.logs = this.render.logs.concat(this.render.logs, this.render.backlog);
            this.render.backlog = [];
            this.$refs.renderlog.scrollToBottom();
          }
        }
        this.options.console.paused = !this.options.console.paused
    },
    openBlendChooser() {
        this.$buefy.modal.open({
            parent: this,
            component: () => import('../components/modals/BlendChooser'),
            trapFocus: true,
            hasModalCard: true,
            events: {
                setBlend: (value) => {
                    this.blend_file = value;
                }
            },
            props: {
                bits: this.user.permissionBits
            }
        })
    },
    openUserSettings() {
        this.$buefy.modal.open({
            parent: this,
            component: () => import('../components/modals/UserModal'),
            trapFocus: true,
            props: {
                user: this.$store.state.users[this.server.id],
                server: this.server,
                
            }
        })
    },
    openZIPModal() {
        this.$buefy.modal.open({
            parent: this,
            component: () => import('../components/modals/ZIPDownloader'),
            trapFocus: true,
            props: {
                server: this.server,
                bits: this.user.permissionBits
            }
        })
    },
    openSettingsModal() {
        this.$buefy.modal.open({
            parent: this,
            component: Settings,
            trapFocus: true,
            props: {
                default: {
                    use_celsius: this.options.stats.use_celsius,
                    socket_enabled: this.options.enable_socket
                }
            },
            events: {
                save: (values) => {
                    this.options.stats.use_celsius = values.use_celsius;
                    this.options.enable_socket = values.socket_enabled
                    window.localStorage.setItem('blender_opts', JSON.stringify(values))
                }
            }
        })
    },  
    openPermissionsModal() {
        this.$buefy.modal.open({
            parent: this,
            component: () => import('../components/modals/Permissions'),
            trapFocus: true,
            hasModalCard: true,
            canCancel: ['escape', 'outside'],
            props: {
                permissions: this.user.permissions,
                bits: this.user.permissionBits
            },
        })
    },
    async openPreview() {
        const res = await fetch(`${this.server.address}/api/render/preview`, {headers: {
            Authorization: this.server.jwt
        }});
        const frame = res.headers.get('x-frame')
        if(res.headers.has('x-frame')) {
            const blob = await res.blob()
            const h = this.$createElement
            const vnode = h('p', { class: "image is-4by3" }, [
                h('img', { attrs: { src:  URL.createObjectURL(blob), alt: frame }})
            ])
            this.$buefy.modal.open({
                content: [ vnode ]
            })
        }else{
            try {
                const json = await res.json();
                this.$buefy.snackbar.open({
                    type: 'is-danger',
                    message: `Could not get a preview: ${json.code}`,
                })
            }catch(err) {
                this.$buefy.snackbar.open({
                    type: 'is-danger',
                    message: `Could not get a preview: ${err.message}`,
                })
            }
        }
    },
    startRender() {
        if(!this.blend_file) {
            return this.$buefy.dialog.alert({
                title: 'Render Failed',
                message: 'A valid .blend file was not provided',
                type: 'is-danger',
                hasIcon: true,
                icon: 'alert-circle'
            })
        }
        this.render.logs = []
        const frames = this.options.blend.frames.all ? null: [ this.options.blend.frames.start,this.options.blend.frames.stop];
        Axios.post(`/api/render/${this.blend_file}` , {
            useGPU: this.options.blend.use_gpu,
            frames,
            python_scripts: this.options.blend.python_scripts,
            extra_arguments: this.options.blend.extra_arguments
        })
        .then((r) => {
            this.render.active = true;
            this.render.current_frame = r.data.current_frame
            this.render.max_frames = r.data.max_frames;
            this.$buefy.toast.open({
                type: 'is-success',
                message: `Render of ${this.blend_file} has been started`
            })
        })
        .catch(err => {
            console.error('Render failed: ', err.response)
            const msg = err.response&&err.response.data.error ? err.response.data.error : err.message;
            this.$buefy.dialog.alert({
                title: 'Render Failed',
                message: msg,
                type: 'is-danger',
                hasIcon: true,
                icon: 'alert-circle'
            })
        })
        //this.render.active = true;
    },
    fetchLogs() {
        Axios.get('/api/render/logs')
        .then(response => {
            this.logs = response.data
        }).catch(err => {
            console.error('Failed to fetch logs', err)
        })
    },
    cancelRender() {
        this.$buefy.dialog.confirm({
            title: 'Abort Render Confirmation',
            message: `Are you sure you want to abort this render? It is currently <b>${this.framePercent}%</b> complete.`,
            confirmText: 'Abort',
            type: 'is-warning',
            hasIcon: true,
            onConfirm() {
                Axios.post('/api/render/cancel')
                .then(() => {
                    this.$buefy.toast.open({
                        type:'is-warning',
                        message:'Render has been cancelled'
                    })
                })
                .catch(err => {
                    this.$buefy.toast.open({
                        type: 'is-danger',
                        message: 'Failed to abort: ' + err.message
                    })
                })
            }
        })
    },
    fetchStatus() {
        Axios.get('/api/render/status')
        .then(response => {
            this.render.active = response.data.active;
            this.render.current_frame = response.data.current_frame;
            this.render.max_frames = response.data.max_frames;
        })
        .catch(err => {
            this.$buefy.snackbar.open({
                message: `<b>Fetching status failure:</b> ${err.message}`,
                actionText: 'Retry',
                onAction: () => this.fetchStatus()
            })
        })
    },
    socketLogin() {
        const id = this.$route.params.server
        this.socket.emit('login', this.server.jwt, cb => {
            if(cb.error) {
                if(cb.unauthorized) {
                    this.$router.push({
                        path: `/login/${id}`,
                        query: { redirect: `/server/${id}`, loggedOut: true, ret: 4}
                    })
                    return;
                }else{
                    this.$buefy.snackbar.open({
                        message: 'Failed to login to socketIO: ' + cb.error,
                        type: 'is-danger'
                    })
                }
            }else{
                this.render.active = cb.status.active;
                this.render.current_frame = cb.status.current_frame;
                this.render.max_frames = cb.status.max_frames;

                if(cb.settings) this.serverSettings = cb.settings
                
            }
        })
    },
    logout() {
        this.$store.commit('logout', this.$route.params.server);
        this.$router.push({
            path: `/login/${this.$route.params.server}`,
            query: {loggedout: true, ret:5}
        })
    },
    formatNumber(number) {
        return number ? number.toLocaleString() : 0
    }
  },
  created() {
        const id = this.$route.params.server
        this.socket = io(this.server.address)
        const storedSettings = window.localStorage.getItem('blender_opts')
        if(storedSettings) {
            const json = JSON.parse(storedSettings)
            this.$emit('save', json);
            this.options.stats.use_celsius = json.use_celsius;
            this.options.enable_socket = json.socket_enabled
        }
        this.socketLogin();
        Axios.defaults.baseURL = this.server.address;
        Axios.defaults.headers.common['Authorization'] = this.server.jwt;
        Axios.interceptors.response.use(response => {
            return response;
        }, (error)  =>{
            if (error.response  && 401 === error.response.status) {
                this.$router.push({
                    path: `/login/${id}`,
                    query: { redirect: `/server/${id}`, expired: true, ret: 6}
                })
            } else {
                return Promise.reject(error);
            }
        });
        if(!this.options.enable_socket) this.fetchStatus()
  },
  mounted() {
      this.fetchLogs();
      this.socket
      .on('connect', () => {
        if(!this.socket_first_inital) this.socket_first_inital = true;
        this.isSocketOffline = false;
        this.socketLogin()
      })
      .on('disconnect', () => {
        this.isSocketOffline = true;
      })
      .on('log', data => {
          if(this.options.console.paused) {
            this.render.backlog.push(data);
          }else{
            this.render.logs.push(data)
            const length = this.render.logs.length ;
            if(length >= 200) {
                this.render.logs.splice(0,length-200)
            }
            if(this.$refs.renderlog) this.$refs.renderlog.scrollToBottom();
          }
      })
      .on('frame',({frame, eta, averageTimePerFrame}) => {
        this.render.current_frame = frame
        //clean up logs, keep only last 200. only on frame
        const length = this.render.logs.length ;
        if(length >= 200) {
            this.render.logs.splice(0,length-200)
        }
        this.render.eta = eta;
        this.render.averageTimePerFrame = averageTimePerFrame;
          //console.log('FRAME:',data)
      })
      .on('render_start', ({render, duration}) => {
          this.render.active = true;
          this.render.current_frame = render.currentFrame || 0;
          this.render.max_frames = render.maximumFrames;
          this.blend_file = render.blend
          this.render.started = duration ? duration.started : Date.now()
          this.render.eta = render.eta;
          this.render.averageTimePerFrame = render.averageTimePerFrame

          this.$buefy.toast.open(`${render.startedByID} has started rendering ${render.blend}`)
      })
      .on('render_stop', (data) => {
          this.render.active = false;
          const duration = this.formatDuration(data.timestmap);
          this.$buefy.dialog.alert({
              title: 'Render Complete',
              message: `<b>${this.blend_file}</b> has been successfully rendered. Took <b>${duration}</b>`,
              type: 'is-success',
              hasIcon: true,
              icon: 'alert-circle'
          })
          this.$buefy.toast.open(`The render for ${this.blend_file} has ended.`)
          this.blend_file = null;
      })
      /*const arr = ["test","error: blah", "warning. sRGB","frame: blah. ", "Saved: 'file/0035.png'"]
      setInterval(() => {
        const element = arr[Math.floor(Math.random() * arr.length)];
        this.render.logs.push({text: element, timestamp: Date.now()})
        if(this.$refs.renderlog) this.$refs.renderlog.scrollToBottom();
      }, 1000)*/
  },
}
</script>

<style>

.disconnected {
    background-color: lightgray !important;
}
.renderprogress {
    border-radius: 0 !important;
    height: .1em !important;
    padding: 0 !important
}
html, body {
    background-color: rgb(240, 240, 240);
}
</style>
