const params = new Map(location.search.slice(1).split('&').map(kv => kv.split('=')))
let socket, uploader;
var app = new Vue({
    el: '#app',
    data:{
        socket_status:false,
        blend_chooser:{
            progress:0,
            uploading:false,
            active:false,
            loading:true,
            blends:null,
            uploads:[]
        },
        zips:{
            loading:true,
            active:false,
            list:null
        },
        render:{
            logs:"",
            active:false,
            current:0,
            max:null
        },
        blend:null,
        stats:{
            initial:true,
            cpu:{
                usage:0,
                speed:0,
                temp:0,
                fan_speed:0,
            },
            mem:{
                used:0,
                total:0,
                free:0
            },
            gpu:[]
        },
        opts:{
            blend:{
                gpu_render:true,
                all_frames:true,
                frame_start:0,
                frame_stop:0,
                py_scripts:[],
                extra_args:""
            },
            stat:{
                update_interval:30,
                celsius:false
            }
        }
    },
    computed:{
        frameValue() {
            if(this.render.max == null) return "- Frame #" + this.render.current;
            return `(${this.render.current}/${this.render.max})`;
        },
        framePercent() {
            if(this.render.max == null) return "";
            return " - " + (this.render.max == 0 ? "0%" : Math.round(this.render.current/this.render.max*100)) + "%";
        },
        getSocketStatus() {
            if(this.socket_status) {
                return `<span class='has-text-success'>Connected</span>`
            }else{
                return `<span class='has-text-danger'>Disconnected</span>`
            }
        }
    },
    created:function() {
        //let domain = params.has('sk_domain') ? params.get('sk_domain') : 'localhost'
        //let port = params.has('sk_port') ? params.get('sk_port') : '8095'
        socket = io.connect();
        uploader = new SocketIOFileClient(socket);
        if(window.localStorage) {
            const opts = window.localStorage.getItem('blender_opts');
            if(opts) {
                this.opts = JSON.parse(opts);
            }
        }else{
            console.warn('Browser does not support localStorage, defaults wont be loaded.')
        }
    },
    mounted() {
        //this.fetchStats();
        uploader.on('start', fileInfo => {
            this.blend_chooser.uploading = true;
            this.blend_chooser.progress = 0;
            console.log('Uploading file',fileInfo.name);
        });
        uploader.on('stream', (fileInfo) => {
            const percent = Math.round(fileInfo.sent/fileInfo.size*100)
            if(this.blend_chooser.progress != percent) this.blend_chooser.progress = percent;
        });
        uploader.on('complete', fileInfo => {
            this.blend_chooser.uploading = false;
            this.blend_chooser.progress = 0;
            this.blend_chooser.uploads = [];
            this.blend_chooser.blends = null;
            this.$toast.open({
                type:'is-success',
                message:'Uploaded all blend files'
            })
            this.refreshBlendChooser();
        });
        uploader.on('error', function(err) {
            console.log('Error!', err);
        });
        uploader.on('abort', fileInfo => {
            this.blend_chooser.uploading = false;
            this.$dialog.alert({
                title: 'Uploaded has been aborted',
                message: `<b>File Info:</b><br>${JSON.stringify(fileInfo)}`,
                type: 'is-warning',
                hasIcon: true,
                icon: 'alert-circle'
            })
            console.log('Aborted: ', fileInfo);
        });


        socket.on('connect', () => {
            this.socket_status = true;
            console.info("Connected to socket")
        });
        socket.on('stat', (data) => {
            this.stats = data;
        });
        socket.on('log',data => {
            if(data.clear) this.render.logs = "";
            if(data.message) this.render.logs += (data.error?'[ERROR] ':'') + data.message;
            if(data.messages) data.messages.forEach(v =>  this.render.logs += (data.error?'[ERROR] ':'') + v)
            document.getElementById("el_renderlog").scrollTop = document.getElementById("el_renderlog").scrollHeight;
        })
        socket.on('frame',data => {
            this.render.current = data;
            console.log('FRAME:',data)
        })
        socket.on('disconnect', () => {
            this.socket_status = false;
            console.error("Disconnected from socket")
        });

        socket.on('render_start',(d) => {
            this.render.active = true;
            this.render.current = 0;
            this.render.max = d.max_frames;
        })
        socket.on('render_stop',() => {
            this.render.active = false;
        })
    },
    methods:{
        saveDefaults() {
            console.log(this.opts)
            if(window.localStorage) {
                window.localStorage.setItem('blender_opts',JSON.stringify(this.opts))
                this.$toast.open({
                    type:'is-success',
                    message:'Saved defaults'
                })
            }else{
                this.$toast.open({
                    type:'is-danger',
                    message:'Your browser doesn\'t support local storage'
                })
            }
            
        },
        downloadZip(name) {
            axios.get(`zip/${name}/download`).then((data) => {
                download(data, name, "application/blender");
            }).catch(err => {
                this.$toast.open({
                    type:'is-danger',
                    message:'Failed to download zIP'
                })
            })
        },
        deleteZip(name) {
            axios.get(`zip/${name}/delete`).then(r => {
                if(r.data.success) {
                    this.$toast.open({
                        type:'is-success',
                        message:'Deleted zip ' + name
                    })
                    if(r.data.zips) {
                        this.zips.list = r.data.zips;
                    }else{
                        this.refreshZIPs();
                    }
                }else{
                    this.$dialog.alert({
                        title: 'Delete Failed',
                        message: '<b>Server returned:</b> ' + JSON.stringify(r.data),
                        type: 'is-warning',
                        hasIcon: true,
                        icon: 'alert-circle'
                    })
                }
            }).catch(err => {
                console.log(err.data)
                this.$dialog.alert({
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
        generateCommand: function() {
            if(!this.blend) return "[No file selected]"
            const type = this.opts.blend.gpu_render?"~/renderGPU.sh":"~/renderCPU.sh";
            const scripts = this.opts.blend.py_scripts.map(v => `-P ${v}`)
            return `${type} "${this.blend}" ${this.opts.blend.all_frames?'all all':`${this.opts.blend.frame_start} ${this.opts.blend.frame_stop}`} ${scripts.join(" ")} ${this.opts.blend.extra_args}`
        },
        uploadFiles() {
            var uploadIds = uploader.upload(this.blend_chooser.uploads, {
                data: { /* Arbitrary data... */ }
            });
            console.log(uploadIds)
        },
        chooseBlend(name) {
            this.blend = name;
            this.blend_chooser.active = false;
        },
        refreshBlendChooser: function() {
            this.blend_chooser.loading = true;
           // if(this.blend_chooser.blends == null) {
                socket.emit('blends',null,res => {
                    this.blend_chooser.loading = false;
                    if(res.error) {
                        this.blend_chooser.active = false;
                        this.$dialog.alert({
                            title: 'Failure',
                            message: 'Could not get a list of blend files<br><strong>Server returned: </strong>' + res.error,
                            type: 'is-danger',
                            hasIcon: true,
                            icon: 'alert-circle'
                        })
                        return;
                    }
                    this.blend_chooser.blends = res.files;
                })
            //}
        },
        refreshZIPs() {
            //if(this.zips.list == null) {
            this.zips.loading = true;
            socket.emit('zips',null,res => {
                this.zips.loading = false;
                if(res.error) {
                    this.zips.active = false;
                    this.$dialog.alert({
                        title: 'Failure',
                        message: 'Could not get a list of zips',
                        type: 'is-danger',
                        hasIcon: true,
                        icon: 'alert-circle'
                    })
                    return;
                }
                this.zips.list = res.files;
            })
            //}
        },
        startRender: function() {
            if(!this.blend) {
                return this.$dialog.alert({
                    title: 'Render Failed',
                    message: 'A valid .blend file was not provided',
                    type: 'is-danger',
                    hasIcon: true,
                    icon: 'alert-circle'
                })
            }
            this.render.logs = "";
            socket.emit('start',{
                blend:this.blend, //need to upload it but sush
                mode:this.opts.blend.gpu_render?'gpu':'cpu',
                frames:(this.opts.blend.all_frames)?null:[this.opts.blend.frame_start,this.opts.blend.frame_stop],
                scripts:this.opts.blend.py_scripts,
                extra_args:this.opts.blend.extra_args
            },res => {
                if(!res) return;
                if(res.error) {
                    return this.$dialog.alert({
                        title: 'Render Failed',
                        message: res.error,
                        type: 'is-danger',
                        hasIcon: true,
                        icon: 'alert-circle'
                    })
                }else{
                    this.$toast.open({
                        type:'is-success',
                        message:'Render has been started.'
                    })
                    console.log("Server Responded: " + JSON.stringify(res))
                }
            })
            
            //this.render.active = true;
        },
        cancelRender: function() {
            socket.emit('cancel',null,res => {
                if(!res.render) {
                    this.$toast.open({
                        type:'is-danger',
                        message:'There is no active renders'
                    })
                }else{
                    this.$toast.open({
                        type:'is-warning',
                        message:'Render has been cancelled'
                    })
                }
            })
            
            //this.render.active = false;
        },
        cm_temp: function(val) {
            if(val===-1) return "n/a";
            let color = "";
            if(val >= 104 && val < 203) {
                color = "has-text-warning"
            }else if(val >= 203 ) {
                color = "has-text-danger"
            }

            if(this.opts.stat.celsius) {
                const c = Math.round((5/9) * (val-32))
                return `<span class='${color}'>${c}°C</span>`;
            }else{
                return `<span class='${color}'>${val}°F</span>`;
            }
        },
        humanize(B,i) {
            var e=i?1e3:1024;if(Math.abs(B)<e)return B+" B";var a=i?["kB","MB","GB","TB","PB","EB","ZB","YB"]:["KiB","MiB","GiB","TiB","PiB","EiB","ZiB","YiB"],t=-1;do B/=e,++t;while(Math.abs(B)>=e&&t<a.length-1);return B.toFixed(1)+" "+a[t]
        }
    }
})