<template>
  <div id="app">
    <div class="container">
        
        <div class="columns">
            <div class="column is-5">
                <p class="title is-1">Blender Render UI</p>
                <p class="subtitle is-4" v-html="socketStatus"></p>
                <span v-if="!render.active">
                <b-field class="file">
                    <b-button type="is-primary" @click="refreshBlendChooser()" icon-left="blender-software">
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
                                    <b-button type="is-danger" outlined @click="cancelRender()">
                                        Stop
                                    </b-button>
                                </div>
                            </div>
                            <div class="navbar-end">
                                <div class="buttons">
                                    <b-button v-if="!render.active" @click="saveDefaults">
                                        <b-icon icon="content-save"></b-icon><span>Save Defaults</span>
                                    </b-button>
                                </div>
                            </div>
                        </div>    
                    </nav>
                </div>
                <b-field>
                    <a @click="refreshZIPs()" class="button is-large is-fullwidth is-info">
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
                <b-field :label="consoleName" >
                  <div :class="['box',{'disconnected': isSocketOffline,}]">
                    <VirtualList
                    v-if="options.console.enabled"
                    
                    style="height: 200px; overflow-y: auto;"
                    :data-key="'timestamp'"
                    :data-sources="render.logs"
                    :keeps="12"
                    ref="renderlog"
                    :data-component="$options.ListComponent"
                    />
                    <p v-else>Console is disabled in options</p>
                  </div>
                    <!--<b-input v-if="options.console.enabled" :disabled="isSocketOffline" id="el_renderlog" type="textarea" v-model="logString" readonly rows=10></b-input>-->
                </b-field>
                <div class="buttons">
                    <b-button @click='render.logs = []' type="is-warning" ><b-icon icon='eraser'></b-icon></b-button>
                    <b-button @click='togglePause' type='is-info'><b-icon :icon="options.console.paused?'play':'pause'"></b-icon></b-button>
                    <b-button @click="modals.settings = true" type="is-info"><b-icon icon="cog"></b-icon></b-button>
                    <b-button v-if="options.console.paused" disabled type="has-no-background">PAUSED</b-button>
                </div>
                
                <span v-if="isSocketOffline">
                    <div v-if="isSocketOffline" class="notification is-danger">
                        Stats are disabled: Disconnected from socket server
                    </div>
                </span>
                <span v-else>
                  <!-- component handles the socket event, just needs settings -->
                  <Statistics :socket="socket" :version.sync="server_version" v-bind="options.stats" />
                </span>
            </div>
        </div>
        <br>
    </div>
    <b-modal :active.sync="modals.settings">
        <div class="box">
            <h3 class='title is-3'>Settings</h3>
            <hr>
            <b-field label="Temperature">
                <b-checkbox v-model="options.stats.use_celsius">
                   Use Celsius
                </b-checkbox>
            </b-field>
            <b-field label="Console">
                <b-checkbox v-model="options.console.enabled">
                    {{options.console.enabled?"Enabled":"Disabled"}}
                </b-checkbox>
            </b-field>
            <b-field label="Console Lines To Keep" :type="(options.console.lines>200)?'is-danger':''" :message="(options.console.lines>200)?'Over 200 lines can cause lag':''">
                <!-- <b-numberinput min="50" max="1000" step="25" v-model="options.console.lines"></b-numberinput> -->
                <b-slider :disabled="!options.console.enabled" v-model="options.console.lines" :min="50" :max="750" ticks :step=25 :tooltip-type="consoleLinesSlider"></b-slider>
            </b-field>
        </div>
    </b-modal>
    <b-modal :active.sync="modals.blend_chooser">
        <div class="box">
            <h3 class='title is-3'>Blend File Chooser</h3>
            <hr>
            
            <h5 class="title is-5">Existing Blend Files <b-button @click='refreshBlendChooser()' type="button is-info " size="is-small" icon-left="refresh">Refresh</b-button></h5>
            <b-table
            :data="blend_chooser.blends||[]"
            :striped="true"
            :hoverable="true"
            :loading="blend_chooser.loading">

            <template slot-scope="props">
                <b-table-column field="name" label="Name">
                    {{ props.row.name }}
                </b-table-column>

                <b-table-column field="size" label="Size">
                    {{ props.row.size | humanize }}
                </b-table-column>

                <b-table-column field="date" label="Last Modified">
                    {{ props.row.date }}
                </b-table-column>

                <b-table-column label="Action">
                    <span v-if="isSocketOffline">(Socket offline)</span>
                    <a v-else @click="chooseBlend(props.row.name)" class="button is-primary is-small">Use</a>
                </b-table-column>

            </template>

            <template slot="empty">
                <section class="section">
                    <div class="content has-text-grey has-text-centered">
                        <p>
                            <b-icon
                                icon="emoticon-sad"
                                size="is-large">
                            </b-icon>
                        </p>
                        <p>No blend files were found.</p>
                    </div>
                </section>
            </template>
            </b-table>
            <hr>
            <h5 class="title is-5">Upload Blend Files</h5>
            <div v-if="isSocketOffline" class="notification is-danger">
                Lost Connection to the Socket Server.
            </div>
            <b-field>
                <b-upload :disabled="isSocketOffline" id="uploader" v-model="blend_chooser.upload.list"
                    multiple
                    accept=".blend"
                    drag-drop>
                    <section class="section">
                        <div class="content has-text-centered">
                            <p>
                                <b-icon
                                    icon="upload"
                                    size="is-large">
                                </b-icon>
                            </p>
                            <p>Drop your files here or click to upload</p>
                        </div>
                    </section>
                </b-upload>
            </b-field>
    
            <div class="tags">
                <span v-for="(file, index) in blend_chooser.upload.list"
                    :key="index"
                    class="tag is-primary" >
                    {{file.name}}
                    <button class="delete is-small"
                        type="button"
                        @click="deleteDropFile(index)">
                    </button>
                </span>
            </div>
            <span v-if="blend_chooser.uploading">
                <progress 
                  v-for="upload in blend_chooser.upload.list" 
                  class="progress" 
                  :value="upload.progress" 
                  :key="upload.id"
                  max="100" 
                />
            </span>
            
            <b-field>
                <b-button @click='uploadFiles' :disabled="blend_chooser.upload.length == 0||isSocketOffline" type="button is-success">Upload Blends</b-button>
            </b-field>
        </div>
    </b-modal>
    <b-modal :active.sync="modals.zip">
        <div class="box">
            <h3 class='title is-3'>Download ZIPs <a @click='refreshZIPs' class="button is-info is-pulled-right"><b-icon icon="refresh"></b-icon><span>Refresh</span></a></h3>
            <hr>
            <b-table
            :data="zips.list"
            striped
            hoverable
            narrowed
            :loading="zips.loading">

            <template slot-scope="props">
                <b-table-column field="name" label="Name">
                  {{ props.row.name }}
                </b-table-column>

                <b-table-column field="size" label="Size">
                    {{ props.row.size | humanize }}
                </b-table-column>

                <b-table-column field="date" label="Last Modified">
                    {{ props.row.date }}
                </b-table-column>

                <b-table-column label="Action">
                  <div class="buttons">
                    <b-button :disabled="isSocketOffline" @click="downloadZip(props.row.name)" type="is-primary"  icon-left="download" icon-size="large" />
                    <b-button  :disabled="isSocketOffline" @click="deleteZip(props.row.name)" type="is-danger"  icon-left="delete" />
                  </div>
                </b-table-column>

            </template>
            

            <template slot="empty">
                <section class="section">
                    <div class="content has-text-grey has-text-centered">
                        <p>
                            <b-icon
                                icon="emoticon-sad"
                                size="is-large">
                            </b-icon>
                        </p>
                        <p>No ZIPs were found.</p>
                    </div>
                </section>
            </template>
            </b-table>
        </div>
    </b-modal>
  </div>
</template>

<script>
import Statistics from './components/Statistics'
import Axios from 'axios'
import io from 'socket.io-client';
import SocketIOFileClient from 'socket.io-file-client';
import VirtualList from 'vue-virtual-scroll-list'
import ListComponent from './components/ListComponent';

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
      modals: {
        settings: false,
        blend_chooser: false,
        zip: false
      },
      zips:{ 
        loading: true, //Is it loading the list
        list: [] //The stored list
      },
      render: {
        logs: [], //The list of logs, is computed into a joined string
        backlog: [], //The backlog of logs if paused
        active: false, //Is the render active
        current_frame: 0, //Current active render frame
        max_frames: 0 //Current active render's maximum frames
      },
      blend_chooser: { 
        upload: { 
          active: false, //Is an upload active?
          list: [] //socket.io-upload list
        },
        loading: false, //Is the list loading?
        blends: [] //The list of blends
      },
      //OPTIONS
      options: {
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
          enabled: true, //Is it enabled at all? (Will ignore all data/error events)
          max_lines: 200 //How many lines to keep
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
      return this.isSocketOffline ? `<span class='has-text-danger'>Disconnected from server</span>` : `<span class='has-text-success'>Connected to Server</span>`
    },
    frameValue() {
        if(this.render.max_frames == null) return "- Frame #" + this.render.current_frame;
        return `(${this.render.current_frame}/${this.render.max_frames})`;
    },
    framePercentRaw() {
      return (this.render.current_frame / this.render.max_frames * 100).toFixed(1)
    },
    framePercent() {
      if(this.render.max_frames == null) return "";
      return " - " + (this.render.max_frames == 0 ? "0%" : this.framePercentRaw + "%");
    },
    consoleLinesSlider() {
      if(this.options.console.lines > 500) {
          return "is-danger";
      }else if(this.options.console.lines > 200) {
          return "is-warning";
      }else{
          return "is-success";
      }
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
    downloadZip(name) {
        //this.downloading = true;
        window.open(`/zip/${encodeURIComponent(name)}/download`,`Download ${name}`)
    },
    deleteZip(name) {
        Axios.get(`/zip/${name}/delete`)
        .then(() => {
            this.$buefy.toast.open({
                type: 'is-success',
                message: `Deleted zip ${name}`
            })
            const index = this.zips.findIndex(v => v.name === name)
            this.zips.list.splice(index, 1);
        }).catch(err => {
            console.log(err.data)
            this.$buefy.dialog.alert({
                title: 'Delete Failed',
                message: '<b>Server returned:</b> ' + err.response?err.response.data.error||JSON.stringify(err.response.data):err.message,
                type: 'is-danger',
                hasIcon: true,
                icon: 'alert-circle'
            })
        })
        
    },
    deleteDropFile(index) {
        this.blend_chooser.uploads.splice(index, 1)
    },
    uploadFiles() {
        var uploadIds = this.uploader.upload(this.blend_chooser.uploads, {
            data: { /* Arbitrary data... */ }
        });
        console.log(uploadIds)
    },
    chooseBlend(name) {
        this.blend_file = name;
        this.modals.blend_chooser = false;
    },
    refreshBlendChooser() {
        this.blend_chooser.loading = true;
        Axios.get('/api/blends')
        .then(response => {
          this.blend_chooser.blends = response.data.files;
          if(!this.modals.blend_chooser) this.modals.blend_chooser = true;
        })
        .catch(err => {
          this.$buefy.snackbar.open({
              title: 'Failure',
              message: 'Failed to fetch list of blends: ' + err.response.status,
              type: 'is-danger',
              hasIcon: true,
              icon: 'alert-circle'
          })
        })
        .finally(() =>  this.blend_chooser.loading = false)
    //}
    },
    refreshZIPs() {
        //if(this.zips.list == null) {
        this.zips.loading = true;
        Axios.get('/api/zips')
        .then(response => {
          this.zips.list = response.data.files;
          if(!this.modals.zip) this.modals.zip = true;
        })
        .catch(err => {
          
          this.$buefy.snackbar.open({
              title: 'Failure',
              message: 'Failed to fetch list of ZIPs: ' + err.response.status,
              type: 'is-danger',
              hasIcon: true,
              icon: 'alert-circle'
          })
        })
        .finally(() => this.zips.loading = false)
        //}
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
            message: 'Are you sure you want to cancel this render? It is currently <b>' + this.framePercentRaw + '</b> complete.',
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
      this.uploader = new SocketIOFileClient(this.socket);
      if(window.localStorage) {
          const opts = window.localStorage.getItem('blender_opts');
          if(opts) {
              const json = JSON.parse(opts);
              if(!json.version || json.version != this.$VERSION) {
                  console.warn('Stored options are for a different version and have been reset')
                  window.localStorage.removeItem("blender_opts");
              }else{
                  this.opts = json;
              }
          }
      }else{
          console.warn('Browser does not support localStorage, defaults wont be loaded.')
      }
  },
  mounted() {
      //this.fetchStats();
      this.uploader.on('start', fileInfo => {
          this.blend_chooser.uploading = true;
          this.blend_chooser.progress = 0;
          console.log('Uploading file',fileInfo.name);
      })
      .on('stream', (fileInfo) => {
          const percent = Math.round(fileInfo.sent/fileInfo.size*100)
          if(this.blend_chooser.progress != percent) this.blend_chooser.progress = percent;
      })
      .on('complete', () => {
          this.blend_chooser.uploading = false;
          this.blend_chooser.progress = 0;
          this.blend_chooser.uploads = [];
          this.blend_chooser.blends = null;
          this.$buefy.toast.open({
              type:'is-success',
              message:'Uploaded all blend files'
          })
          this.refreshBlendChooser();
      })
      .on('error', (err) => {
          console.log('Error!', err);
      })
      .on('abort', fileInfo => {
          this.blend_chooser.uploading = false;
          this.$buefy.dialog.alert({
              title: 'Uploaded has been aborted',
              message: `<b>File Info:</b><br>${JSON.stringify(fileInfo)}`,
              type: 'is-warning',
              hasIcon: true,
              icon: 'alert-circle'
          })
          console.log('Aborted: ', fileInfo);
      });


      this.socket
      .on('connect', () => {
        if(!this.socket_first_inital) this.socket_first_inital = true;
        console.info("Connected to socket")
      })
      .on('disconnect', console.error("Disconnected from socket"))
      .on('log', data => {
          if(!this.opts.console.enabled) return;
          
          if(this.options.console.paused) {
            this.render.backlog.push(data);
          }else{
            if(data.message) this.render.logs.push(data)
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
