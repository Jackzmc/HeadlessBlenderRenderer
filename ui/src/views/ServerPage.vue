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
            <b-navbar-item tag="router-link" :to="'/server/' + server.id + '/admin'" v-if="user.permissions & 16 || user.permissions == 99">
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
                <template v-if="render.active">
                    <div class="notification is-dark">
                        <h6 class="title is-6">Rendering <span class="has-text-success">{{blend_file}}</span></h6>
                        <progress class="progress is-small renderprogress is-success" :value='render.current_frame' :max='render.max_frames'>{{framePercent}}</progress>
                        <p><strong>ETA: </strong>{{formatDuration(render.eta)}}</p>
                        <p><strong>Average time per frame: </strong>{{formatDuration(averageTimePerFrame)}}</p>
                        <br>
                        <nav class="level" > 
                        <!-- Left side -->
                            <div class="level-left">
                                <div class="level-item">
                                    <div class="buttons">
                                        <b-button type="is-danger" outlined @click="cancelRender()" :disabled="!hasRenderPermission">
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
                                <p class="level-item">{{framesRendered}} frames complete</p>
                                <p class="level-item">{{framePercent}}%</p>
                            </div>
                        </nav>
                    </div>
                    <div>
                        <div class="card">
                            <div class="card-image">
                                <figure class="image is-64by64">
                                    <img ref="preview"/>
                                </figure>
                            </div>
                            <footer class="card-footer">
                                <p class="card-footer-item">
                                    Frame #{{ preview.frame }} Preview
                                </p>
                            </footer>
                        </div>
                    </div>
                    <br>
                </template>
                <template v-else>
                    <b-field class="file">
                        <b-button :disabled="render.active" type="is-primary" size="is-large" @click="openBlendChooser" icon-left="blender-software">
                            <span>Choose a blend file</span>
                        </b-button>
                        <span class="file-name" v-if="blend_file">
                            {{ blend_file }}
                        </span>
                    </b-field>
                    <template v-if="blendMeta">
                        <b-field label="Render Mode">
                            <b-radio-button v-model="options.blend.use_gpu"
                                :native-value="false"
                                type="is-primary is-light is-outlined">
                                <b-icon icon="server"></b-icon>
                                <span>CPU</span>
                            </b-radio-button>

                            <b-radio-button v-model="options.blend.use_gpu"
                                :native-value="true"
                                type="is-primary is-light is-outlined">
                                <b-icon icon="expansion-card"></b-icon>
                                <span>GPU</span>
                            </b-radio-button>
                        </b-field>
                        <b-field label="Frame Selection">
                            <b-slider v-model="frame_selector" :min="0" :max="blendMeta.totalFrames">
                            </b-slider>
                        </b-field>
                        <br>
                        <b-field>
                            <b-button @click="openRenderSettingsModal">View More Options</b-button>
                        </b-field>
                    </template>
                    <p v-else-if="blend_file" class="my-5 mx-2 has-text-size-2">Fetching blend metadata...</p>
                    <br>
                </template>
                <div class="notification is-dark" v-if="!render.active">
                    <nav class="level" > 
                        <!-- Left side -->
                        <div class="level-left">
                            <div class="level-item">
                                <div class="buttons">
                                    <b-button :disabled="blend_file==null||!hasRenderPermission" type="is-success" @click="startRender()">
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
                <p class="title is-3">
                    <b-field grouped group-multiline>
                        <div class="control">
                            <b-taglist attached>
                                <b-tag type="is-dark">Server</b-tag>
                                <b-tag type="is-info">{{ $route.params.server }}</b-tag>
                            </b-taglist>
                        </div>
                        <div class="control">
                            <b-taglist attached>
                                <b-tag type="is-dark">Live View</b-tag>
                                <b-tag :type="isSocketOffline ? 'is-danger':'is-success'">{{ isSocketOffline ? (options.enable_socket ? 'Offline' : 'Disabled') : ' Connected' }}</b-tag>
                            </b-taglist>
                        </div>
                        <div class="control" v-if="!stats_available">
                            <b-taglist attached>
                                <b-tag type="is-dark">Statistics</b-tag>
                                <b-tag type="is-warning">Unavailable</b-tag>
                            </b-taglist>
                        </div>
                    </b-field>
                </p>
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
                    <h5 class="title is-5">Live View has been disabled. Re-enable in settings to see console and statistics.</h5>
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
                </nav>
                
                <span v-if="options.enable_socket && stats_available">
                    <span v-if="isSocketOffline">
                        <div v-if="isSocketOffline" class="notification is-danger">
                            Stats are disabled: Disconnected from live view
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
import RenderSettings from '../components/modals/RenderSettings'

import io from 'socket.io-client';
import VirtualList from 'vue-virtual-scroll-list'
import humanizeDuration from "humanize-duration";
import Axios from 'axios'

// The absolute quickest time duration to get new frames
const MIN_PREVIEW_TIME = 1000 * 12

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
      frame_selector: [0, 0],
      //STATES
      blend_file: null, //Choosen blend file
      render: {
        logs: [], //The list of logs, is computed into a joined string
        backlog: [], //The backlog of logs if paused
        active: false, //Is the render active
        current_frame: 0, //Current active render frame
        max_frames: 0, //Current active render's maximum frames,
        start_frame: 0,
        lastFrameDurations: [], //Cache last X frames to get AVG seconds/frame
        started: null,
        last_frame_time: null,
        eta: 0,
        averageTimePerFrame: 0
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
          extra_arguments: null, //Any extra arguments as a string
          render_quality: 100
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
      },
      blendMeta: null,
      preview: {
        lastPreview: 0,
        frame: 0,
        fetching: false
      },
      stats_available: false
    }
  },
  computed: {
    averageTimePerFrame() {
        if(this.render.current_frame == 0) return Date.now() - this.render.last_frame_time
        else return this.render.averageTimePerFrame 
    },
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
    hasRenderPermission() {
        return true //this.user.permissions & 8
    },
    tokens() {
        if(this.user.permissions === 99 || this.user.permissions & 255) {
            return '∞'
        }else{
            return this.formatNumber(this.user.tokens)
        }
    },
    renderStatus() {
        if(this.hasRenderPermission)
            return !this.blend_file ? 'Select a blend file to start' : 'Idle'
        else 
            return 'You lack permissions to start/stop renders.'
    },
    frameValue() {
        if(this.render.max_frames == null) return "- Frame #" + this.render.current_frame;
        return `()`;
    },
    framesRendered() {
        return `${this.render.current_frame - this.render.start_frame} / ${this.render.max_frames - this.render.start_frame}`
    },
    framePercent() {
      if(this.render.max_frames == null) return "";
      if(!this.render.active) return 0;
      return ((this.render.current_frame - this.render.start_frame) / (this.render.max_frames - this.render.start_frame) * 100).toFixed(1)
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
                    this.frame_selector = [0, 0]
                    this.fetchBlendMeta()
                }
            },
            canCancel: ["escape", "outside"],
            props: {
               permissions: this.user.permissions,
            }
        })
    },
    openUserSettings() {
        this.$buefy.modal.open({
            parent: this,
            component: () => import('../components/modals/UserModal'),
            trapFocus: true,
            canCancel: ["escape", "outside"],
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
            canCancel: ["escape", "outside"],
            props: {
                server: this.server,
                permissions: this.user.permissions
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
            canCancel: ["escape", "outside"],
            events: {
                save: (values) => {
                    this.options.stats.use_celsius = values.use_celsius;
                    this.options.enable_socket = values.socket_enabled
                    window.localStorage.setItem('blender_opts', JSON.stringify(values))
                }
            }
        })
    },  
    openRenderSettingsModal() {
        this.$buefy.modal.open({
            parent: this,
            component: RenderSettings,
            trapFocus: true,
            props: {
                settings: this.options.blend,
                serverSettings: this.serverSettings,
                render: this.render
            },
            canCancel: ["escape", "outside"],
            events: {
                save: (value) => {
                    this.options.blend = value
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
            },
        })
    },
    async openPreview() {
        this.previewPending = true;
        const res = await fetch(`${this.server.address}/api/render/preview`, {headers: {
            Authorization: this.server.jwt
        }});
        this.previewPending = false
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
    async fetchPreview() {
        this.preview.fetching = true;
        const res = await fetch(`${this.server.address}/api/render/preview`, {headers: {
            Authorization: this.server.jwt
        }});
        this.preview.fetching = false
        if(res.headers.has('x-frame')) {
            this.preview.frame = Number(res.headers.get('x-frame'))
            this.preview.lastPreview = Date.now()
            const blob = await res.blob()
            this.$refs.preview.src = URL.createObjectURL(blob)
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
        Axios.post(`/api/render/${this.blend_file}` , {
            useGPU: this.options.blend.use_gpu,
            frames: this.frame_selector,
            python_scripts: this.options.blend.python_scripts,
            extra_arguments: this.options.blend.extra_arguments
        })
        .then(() => {
            this.render.active = true;
            this.render.current_frame = this.frame_selector[0]
            this.render.start_frame = this.render.current_frame
            this.render.max_frames = this.frame_selector[1]
            this.$buefy.toast.open({
                type: 'is-success',
                message: `Render of ${this.blend_file} has been started`
            })
            this.blend_file = null
            this.blendMeta = null
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
        Axios.get('/api/render/status?src=dash&v=' + this.$VERSION)
        .then(response => {
            this.render.active = response.data.active;
            this.render.current_frame = response.data.render.currentFrame;
            this.render.max_frames = response.data.render.maximumFrames;
            this.render.start_frame = response.data.render.startFrame
            this.render.eta = response.data.eta
            this.render.averageTimePerFrame = response.data.averageTimePerFrame
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
                        message: 'Could not authenticate to Live View: ' + cb.error,
                        type: 'is-danger'
                    })
                }
            }else{
                this.stats_available = cb.statsAvailable
                this.render.active = cb.status.active;
                this.render.start_frame = cb.status.render?.start_frame || 0
                this.render.current_frame = cb.status.render?.currentFrame
                this.render.max_frames = cb.status.render?.maximumFrames
                if(this.render.start_frame > 0) {
                    this.options.blend.frames.all = false,
                    this.options.blend.frames.start = this.render.start_frame
                    this.options.blend.frames.stop = this.render.max_frames
                }

                this.render.eta = cb.status.eta
                this.render.averageTimePerFrame = cb.status.averageTimePerFrame
                this.blend_file = cb.status.render?.blend

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
    },
    fetchBlendMeta() {
        this.blendMeta = null
        Axios.get(`/api/blends/${this.blend_file}/meta`)
            .then(response => {
                this.blendMeta = response.data
                this.frame_selector = [ 0, this.blendMeta.totalFrames ]
            })
            .catch(err => {
                this.$buefy.toast.open({
                    type: 'is-danger',
                    title: "Could not fetch blend file metadata",
                    message: err.message
                })
            })
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
                if(error.response.data?.code === "TOKEN_EXPIRED") {
                    this.$router.push({
                        path: `/login/${id}`,
                        query: { redirect: `/server/${id}`, expired: true, ret: 6}
                    })
                }else{
                    this.$router.push({
                        path: `/login/${id}`,
                        query: { redirect: `/server/${id}`, unauthorized: true, ret: 7}
                    })
                }
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
        if(this.render.logs.length >= 200) {
            this.render.logs.splice(0, length - 200)
        }

        this.render.eta = eta;
        this.render.averageTimePerFrame = averageTimePerFrame;
        if(Date.now() - this.preview.lastPreview > MIN_PREVIEW_TIME && !this.preview.fetching) {
            this.fetchPreview()
        }
      })
      .on('render_start', ({render, duration}) => {
          this.render.active = true;
          this.render.current_frame = render.currentFrame || 0;
          this.render.max_frames = render.maximumFrames;
          this.render.start_frame = render.startFrame || 0
          this.blend_file = render.blend
          this.render.started = duration ? duration.started : Date.now()
          this.render.eta = render.eta;
          this.render.averageTimePerFrame = render.averageTimePerFrame
          this.preview = { frame: 0, lastPreview: 0 }

          this.$buefy.toast.open(`${render.startedByName} has started rendering ${render.blend}`)
      })
      .on('render_stop', (data) => {
          this.render.active = false;
          const duration = this.formatDuration(data.timeTaken);
          if(data.reason) {
            this.$buefy.dialog.alert({
                title: 'Render Aborted',
                message: `<b>${this.blend_file}</b> was aborted for: ${data.reason}. Took <b>${duration}</b>`,
                type: 'is-warning',
                hasIcon: true,
                icon: 'alert-circle'
            })
            this.$buefy.toast.open({ message: `The render for ${this.blend_file} has been aborted`, type: 'is-warning' })
          } else {
            this.$buefy.dialog.alert({
                title: 'Render Complete',
                message: `<b>${this.blend_file}</b> has been successfully rendered. Took <b>${duration}</b>`,
                type: 'is-success',
                hasIcon: true,
                icon: 'checkmark'
            })
            this.$buefy.toast.open(`The render for ${this.blend_file} has completed`)
          }
          this.blend_file = null;
      })
  },
  watch: {
      "options.blend.frames.start": function(val) {
          if(val > this.options.blend.frames.stop) {
              this.options.blend.frames.stop = val;
          }
      }
  }
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
