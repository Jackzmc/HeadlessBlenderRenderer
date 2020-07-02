<template>
<div class="box">
    <h3 class='title is-3'>Blend File Chooser</h3>
    <p class="subtitle is-6"><b-button @click='refresh()' type="button is-info " size="is-small" icon-left="refresh">Refresh Files</b-button></p>
    
    <b-tabs>
        <b-tab-item label="Blend files">
            <b-table
            :data="blends"
            striped
            hoverable
            :loading="loading"
            >
                <template slot-scope="props">
                    <b-table-column field="name" label="Name">
                        {{ props.row.file }}
                    </b-table-column>
                    <b-table-column field="size" label="Size">
                        {{ props.row.size }}
                    </b-table-column>
                    <b-table-column field="date" label="Last Modified">
                        {{ props.row.date }}
                    </b-table-column>
                    <b-table-column label="Action" >
                        <a @click="chooseBlend(props.row.name)" class="button is-primary is-small">Use</a>
                    </b-table-column>
                </template>


                <template slot="empty">
                    <section class="section">
                        <div class="content has-text-grey has-text-centered">
                            <p><b-icon icon="emoticon-sad" size="is-large" /></p>
                            <p>No blend files were found.</p>
                        </div>
                    </section>
                </template>
            </b-table>
        </b-tab-item>
        <b-tab-item label="Folders">
            <b-table
            :data="folders"
            detailed
            striped
            hoverable
            :loading="loading"
            >
                <template slot-scope="props">
                    <b-table-column field="name" label="Name">
                        {{ props.row.folder }}
                    </b-table-column>
                    <b-table-column label="Files">
                        {{ props.row.files.length }}
                    </b-table-column>
                </template>

                <template slot="detail" slot-scope="props">
                    <strong>Contents</strong>
                    <ul>
                        <li v-for="file in props.row.files" :key="file">{{file}}</li>
                    </ul>
                </template>

                <template slot="empty">
                    <section class="section">
                        <div class="content has-text-grey has-text-centered">
                            <p><b-icon icon="emoticon-sad" size="is-large" /></p>
                            <p>No folders were found.</p>
                        </div>
                    </section>
                </template>
            </b-table>
        </b-tab-item>
    </b-tabs>
    <hr>
    <div class="columns">
        <div class="column">
            <h5 class="title is-5">Upload Blend Files</h5>
            <p>Uploads any .blend files, overwriting existing files.</p>
            <br>
            <b-field>
                <b-upload id="uploader" v-model="blend.uploads"
                    multiple
                    accept=".blend"
                    drag-drop
                    @input="removeDuplicateBlends"
                >
                    <section class="section">
                        <div class="content has-text-centered">
                            <p>
                                <b-icon
                                    icon="upload"
                                    size="is-large">
                                </b-icon>
                            </p>
                            <p>Drop your .blend files here or click to upload</p>
                        </div>
                    </section>
                </b-upload>
            </b-field>
            <div class="tags">
                <span v-for="(file, index) in blend.uploads"
                    :key="file.name"
                    class="tag is-primary" >
                    {{file.name}}
                    <button class="delete is-small"
                        type="button"
                        @click="removeBlendUpload(index)">
                    </button>
                </span>
            </div>
            <progress v-if="blend.uploading" class="progress" :value="blend.progress" max="100" />
            <b-field>
                <b-button @click='uploadBlends' :disabled="blend.uploads.length == 0" type="button is-success">Upload Blends</b-button>
            </b-field>
        </div>
        <div class="column">
            <h5 class="title is-5">Upload ZIP as folder</h5>
            <p>ZIP will be extracted to a folder with the same name. It will overwrite any existing folder.</p>
            <br>
            <b-field class="file">
                <b-upload v-model="zip.file" accept=".zip" >
                    <a class="button is-primary">
                        <b-icon icon="upload" />
                        <span>Click to upload a .ZIP</span>
                    </a>
                </b-upload>
                <span class="file-name" v-if="zip.file">
                    {{ zip.file.name }}
                </span>
            </b-field>
             <progress v-if="zip.uploading" class="progress" :value="zip.progress" max="100" />
            <b-field>
                <b-button @click='uploadZIP' :disabled="!zip.file" type="button is-success">Upload ZIP</b-button>
            </b-field>
        </div>
    </div>

</div>
</template>

<script>
import Axios from 'axios'

export default {
    data() {
        return {
            uploader: null, //SocketIOFileClient
            blends: [], //List of blend files
            folders: [], //List of folders

            blend: {
                uploads: [],
                progress: 0,
                uploading: false
            },
            zip: {
                file: null,
                progress: 0,
                uploading: false
            },
            loading: false //are the lists loading?
        }
    },
    methods:{
        refresh() {
            this.loading = true;
            Axios.get('/api/blends')
            .then(response => {
                this.blends = response.data.blends
                this.folders = response.data.folders
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
            .finally(() =>  this.loading = false)
        },
        removeBlendUpload(index) {
            this.blend.uploads.splice(index, 1)
        },
        chooseBlend(name) {
            this.$emit('setBlend', name)
        },
        uploadBlends() {
            const formdata = new FormData();
            const size = this.blend.uploads.length;
            this.blend.uploads.forEach((file,index) => {
                formdata.append(`files[${index}]`, file)
            })
            //onUploadProgress
            this.blend.progress = 0;
            this.blend.uploading = true;
            const _this = this;
            Axios.post('/api/blends/upload', formdata, {
                headers: {'Content-Type': 'multipart/form-data'},
                onUploadProgress(event) {
                    _this.blend.progress = event.loaded / event.total * 100
                }
            })
            .then(response => {
                const failed = response.data.failures.length;

                response.data.uploads.forEach(upload => {
                    if(this.blends.length > 0) {
                        let found = false;
                        this.blends.forEach((blend,i) => {
                            //Check if any file was overwrited, and overwrite it in table
                            if(blend.file === upload.file) {
                                this.blends[i] = upload;
                                found = true;
                                return;
                            }
                        })
                        if(!found) this.blends.push(upload)
                    }
                    if(failed > 0) {
                        const index = this.blend.uploads.findIndex(file => upload.file === file);
                        if(index >= 0) this.blend.uploads.splice(index, 1)
                    }
                })
                if(failed > 0) {
                    console.error('Blend files failed upload: ', response.data.failures)
                    this.$buefy.toast.open({
                        type: 'is-warning',
                        message: `${failed}/${size} files failed to upload.`
                    })
                }else{
                    this.$buefy.toast.open({
                        type: 'is-success',
                        message: `Uploaded ${size} .blend files successfully`
                    })
                    this.blend.uploads = []
                }
            })
            .catch(err => {
                this.$buefy.dialog.alert({
                    title: 'Blend upload has been aborted',
                    message: err.message,
                    type: 'is-warning',
                    hasIcon: true,
                    icon: 'alert-circle'
                })
            })
            .finally(() => this.blend.uploading = false)
        },
        uploadZIP() {
            const formdata = new FormData();
            formdata.append('file', this.zip.file)
            //onUploadProgress
            this.zip.progress = 0;
            this.zip.uploading = true;
            const _this = this;
            Axios.post('/api/zips/upload', formdata, {
                headers: {'Content-Type': 'multipart/form-data'},
                onUploadProgress(event) {
                    _this.zip.progress = event.loaded / event.total * 100
                }
            })
            .then(() => {
                this.zip.file = null;
                this.refresh();
            })
            .catch(err => {
                this.$buefy.dialog.alert({
                    title: 'ZIP upload has failed',
                    message: err.message,
                    type: 'is-error',
                    hasIcon: true,
                    icon: 'alert-circle'
                })
            })
            .finally(() => this.zip.uploading = false)
        },
        removeDuplicateBlends() {
            const names = [];
            const accepted = []
            this.blend.uploads.forEach(v => {
                if(!names.includes(v.name)) {
                    names.push(v.name)
                    accepted.push(v)
                }
            })
            this.blend.uploads = accepted;
        }
    },
    mounted() { 
        this.refresh() 
    }
}
</script>