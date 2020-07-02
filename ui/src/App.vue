<template>
  <div id="app">
    <div class="container">
        <div class="columns">
            <div class="column is-5">
                <p class="title is-1">Blender Render UI</p>
                <p class="subtitle is-4" v-html="socketStatus"></p>
                <span v-if="!render.active">
                <b-field class="file">
                    <b-button type="is-primary" @click="openBlendChooser" icon-left="blender-software">
                        <span>Choose a blend file</span>
                    </b-button>
                    <span class="file-name" v-if="blend_file">
                        {{ blend_file }}
                    </span>
                </b-field>
                <b-field label="Render Options">
                    <b-checkbox v-model="options.blend.use_gpu">
                        Rendering with {{options.blend.use_gpu? "GPU" : "CPU"}}
                    </b-checkbox>
                </b-field>
                <b-field label="Frame Options">
                    <b-checkbox v-model="options.blend.frames.all">
                        Render all frames
                    </b-checkbox>
                </b-field>
                <div v-if="!options.blend.frames.all" class="columns">
                    <div class="column">
                        <b-field label="Starting Frame">
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
                        <b-field label="Ending Frame">
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
                    <b-taginput
                        v-model="options.blend.python_scripts"
                        placeholder="Comma-separated list of files"
                        type="is-dark">
                    </b-taginput>
                </b-field>
                <b-field label="Extra Command Arguments (Optional) (Disabled for now)">
                    <b-input
                      v-model="options.blend.extra_arguments" 
                      disabled 
                    />
                </b-field>
                <span v-if="blend_file != null">
                  <br>
                  <b>Command:</b> {{command}}
                  <br>
                </span>
                <br>
                </span>
                <div class="notification is-dark">
                    <div v-if="render.active">
                        <div><strong class="is-white">A render is currently in progress {{frameValue}}{{framePercent}}</strong></div>
                        <br>
                        <span v-if="render.max != null">
                            <progress v-if="render.max != null" class="progress" :value='render.current_frame' :max='render.max'></progress>
                        </span>
                        <br>
                    </div>
                    <nav class="navbar is-dark">
                        <div class="navbar-menu">
                            <div class="navbar-start">
                                <div class="buttons">
                                    <b-button :disabled="render.active||blend_file==null" type="is-success" @click="startRender()">
                                        Render
                                    </b-button>
                                    <b-button :disabled="!render.active" type="is-danger" outlined @click="cancelRender()">
                                        Stop
                                    </b-button>
                                </div>
                            </div>
                            <div class="navbar-end">
                                <div class="buttons">
                                    
                                </div>
                            </div>
                        </div>    
                    </nav>
                </div>
                <b-field>
                    <a @click="openZIPModal()" class="button is-large is-fullwidth is-info">
                        <b-icon icon="download"></b-icon>
                        <span>Download ZIPs</span>
                    </a>
                </b-field>
                <p>
                    <a class="has-text-weight-bold" href="https://github.com/Jackzmc/HeadlessBlenderWebUI/">
                        HeadlessBlenderWebUI
                    </a> 
                    <span>UI v{{$VERSION}} </span><span v-if="server_version">| Server v{{server_version}}</span>
                </p>
            </div>
            <div class="column is-7">
                <br>
                <br>
                <br>
                <b-field v-if="options.enable_socket" :label="consoleName" >
                  <div :class="['box',{'disconnected': isSocketOffline,}]">
                    <VirtualList                    
                    style="height: 200px; overflow-y: auto;"
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
                <div class="buttons">
                    <b-button v-if="options.enable_socket" @click='render.logs = []' type="is-warning" ><b-icon icon='eraser'></b-icon></b-button>
                    <b-button v-if="options.enable_socket" @click='togglePause' type='is-info'><b-icon :icon="options.console.paused?'play':'pause'"></b-icon></b-button>
                    <b-button @click="openSettingsModal" type="is-info" :size="options.enable_socket?'':'is-large'">
                        <b-icon icon="cog" :size="options.enable_socket?'':'is-large'"></b-icon>
                        <span v-if="!options.enable_socket">Settings</span>
                    </b-button>
                    <b-button v-if="options.console.paused&&options.enable_socket" disabled type="has-no-background">PAUSED</b-button>
                </div>
                
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
import Statistics from './components/Statistics'
import io from 'socket.io-client';
import VirtualList from 'vue-virtual-scroll-list'
import ListComponent from './components/ListComponent';
import Settings from './components/Settings'

export default {
  name: 'App',
  ListComponent,
  components: {
    Statistics,
    VirtualList,
  },
  data() {
    return {
      socket: null, //Socket.io connection handle
      uploader: null, //SocketIOFileClient
      socket_first_inital: false, //if this is the first connection
      server_version: null,
      //STATES
      blend_file: null, //Choosen blend file
      render: {
        logs: [], //The list of logs, is computed into a joined string
        backlog: [], //The backlog of logs if paused
        active: false, //Is the render active
        current_frame: 0, //Current active render frame
        max_frames: 0 //Current active render's maximum frames
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
      }
    }
  },
  computed: {
    consoleName() {
      return `Console Output (${this.render.logs.length} lines)`
    },
    isSocketOffline() {
      return this.socket&&this.socket.disconnected;
    },
    command() {
      if(!this.blend_file) return "[No file selected]"
      const type = this.optionss.blend.use_gpu? "~/renderGPU.sh":"~/renderCPU.sh";
      const scripts = this.optionss.blend.python_scripts.map(v => `-P ${v}`)
      const frame_number = this.opts.blend.frames.all? 'all all' : `${this.opts.blend.frames.start} ${this.opts.blend.frames.stop}`
      return `${type} "${this.blend_file}" ${frame_number} ${scripts.join(" ")} ${this.opts.blend.extra_arguments}`
    },
    socketStatus() {
      return this.isSocketOffline ? `<span class='has-text-danger'>Disconnected from socket server</span>` : `<span class='has-text-success'>Connected to socket server</span>`
    },
    frameValue() {
        if(this.render.max_frames == null) return "- Frame #" + this.render.current_frame;
        return `(${this.render.current_frame}/${this.render.max_frames})`;
    },
    framePercentRaw() {
        if(!this.render.active) return 0;
        return (this.render.current_frame / this.render.max_frames * 100).toFixed(1)
    },
    framePercent() {
      if(this.render.max_frames == null) return "";
      return " - " + (this.render.max_frames == 0 ? "0%" : this.framePercentRaw + "%");
    },
  },
  methods:{
    togglePause() {
        //if currently paused, to be resumed, fill backlog
        if(this.options.console.paused) {
          if(this.render.backlog.length > 0 ) {
            this.render.logs.push("Console unpaused, filling with backlog")
            this.render.logs.push("")
            this.render.logs = this.render.logs.concat(this.render.logs, this.render.backlog);
            this.render.backlog = [];
            document.getElementById("el_renderlog").scrollTop = document.getElementById("el_renderlog").scrollHeight;
          }
        }
        this.options.console.paused = !this.options.console.paused
    },
    saveDefaults() {
        console.log(this.opts)
        if(window.localStorage) {
            window.localStorage.setItem('blender_opts',JSON.stringify(this.opts))
            this.$buefy.toast.open({
                type:'is-success',
                message:'Saved defaults'
            })
        }else{
            this.$buefy.toast.open({
                type:'is-danger',
                message:'Your browser doesn\'t support local storage'
            })
        }
        
    },
    openBlendChooser() {
        this.$buefy.modal.open({
            parent: this,
            component: () => import('../src/components/BlendChooser'),
            trapFocus: true,
            events: {
                setBlend(value) {
                    this.blend_file = value;
                }
            }
        })
    },
    openZIPModal() {
        this.$buefy.modal.open({
            parent: this,
            component: () => import('../src/components/ZIPDownloader'),
            trapFocus: true,
            events: {
                
            }
        })
    },
    openSettingsModal() {
        const _this = this;
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
                save(values) {
                    console.debug(values)
                    _this.options.stats.use_celsius = values.use_celsius;
                    _this.options.enable_socket = values.socket_enabled
                }
            }
        })
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
        this.render.logs = "";
        this.socket.emit('start',{
            blend: this.blend_file, //need to upload it but sush
            mode:this.opts.blend.gpu_render?'gpu':'cpu',
            frames:(this.opts.blend.all_frames)?null:[this.opts.blend.frame_start,this.opts.blend.frame_stop],
            scripts:this.opts.blend.py_scripts,
            extra_args:this.opts.blend.extra_args
        },res => {
            if(!res) return;
            if(res.error) {
                return this.$buefy.dialog.alert({
                    title: 'Render Failed',
                    message: res.error,
                    type: 'is-danger',
                    hasIcon: true,
                    icon: 'alert-circle'
                })
            }else{
                this.$buefy.toast.open({
                    type:'is-success',
                    message:'Render has been started.'
                })
                console.log("Server Responded: " + JSON.stringify(res))
            }
        })
        
        //this.render.active = true;
    },
    cancelRender() {
        this.$buefy.dialog.confirm({
            title: 'Stop Render Confirmation',
            message: `Are you sure you want to cancel this render? It is currently <b>${this.framePercentRaw}%</b> complete.`,
            confirmText: 'Stop Render',
            type: 'is-warning',
            hasIcon: true,
            onConfirm() {
                this.socket.emit('cancel',null,res => {
                    if(!res.render) {
                        this.$buefy.toast.open({
                            type:'is-danger',
                            message:'There is no active render'
                        })
                    }else{
                        this.$buefy.toast.open({
                            type:'is-warning',
                            message:'Render has been cancelled'
                        })
                    }
                })
            }
        })
        //this.render.active = false;
    }
  },
  created() {
      //let domain = params.has('sk_domain') ? params.get('sk_domain') : 'localhost'
      //let port = params.has('sk_port') ? params.get('sk_port') : '8095'
        this.socket = io.connect();
        const storedSettings = window.localStorage.getItem('blender_opts')
        if(storedSettings) {
            const json = JSON.parse(storedSettings)
            this.$emit('save', json);
            this.options.stats.use_celsius = json.use_celsius;
            this.options.enable_socket = json.socket_enabled
        }
  },
  mounted() {

      this.socket
      .on('connect', () => {
        if(!this.socket_first_inital) this.socket_first_inital = true;
        console.info("Connected to socket")
      })
      .on('disconnect', console.error("Disconnected from socket"))
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
      .on('frame',data => {
          this.render.current_frame = data;
          //clean up logs, keep only last 200. only on frame
          const length = this.render.logs.length ;
          if(length >= 200) {
            this.render.logs.splice(0,length-200)
          }
          //console.log('FRAME:',data)
      })
      .on('render_start',({frame, max_frames}) => {
          this.render.active = true;
          this.render.current_frame = frame || 0;
          this.render.max_frames = max_frames;
      })
      .on('render_stop',(data) => {
          this.$buefy.dialog.alert({
              title: 'Render Complete',
              message: `<b>${this.blend_file}</b> has been successfully rendered. Took <b>${data.time_taken}</b>`,
              type: 'is-success',
              hasIcon: true,
              icon: 'alert-circle'
          })
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
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-top: 20px;
}
.disconnected {
    background-color: lightgray !important;
}
</style>
