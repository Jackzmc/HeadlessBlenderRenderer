<template>
<div class="modal-card" style="width: auto; font-size: 20px">
    <header class="modal-card-head">
        <h3 class='modal-card-title'>Blend File Chooser</h3>
        <button
            type="button"
            class="delete"
            @click="$emit('close')"/>
    </header>
    <section class="modal-card-body">
        <b-tabs>
            <b-tab-item label="Blend files">
                <b-table
                :data="blends"
                striped
                hoverable
                :loading="loading"
                >
                    <b-table-column field="name" label="Name" sortable v-slot="props">
                        {{ props.row.file }}
                    </b-table-column>
                    <b-table-column field="size" label="Size" sortable v-slot="props">
                        {{ props.row.size | humanize}}
                    </b-table-column>
                    <b-table-column field="timestamp" label="Last Modified" sortable v-slot="props">
                        {{ props.row.date }}
                    </b-table-column>
                    <b-table-column label="Action" v-slot="props" :visible="hasPermission">
                        <div class="buttons">
                            <a @click="chooseBlend(props.row.file)" class="button is-primary">Use</a>
                            <b-button @click="deleteBlend(props.row.file)" type="is-danger"  icon-left="delete" />
                        </div>
                    </b-table-column>


                    <template slot="empty">
                        <section class="section">
                            <div class="content has-text-grey has-text-centered">
                                <p>No blend files were found.</p>
                                <p class="subtitle is-6"><b-button @click='refresh()' type="button is-info " size="is-small" icon-left="refresh">Refresh</b-button></p>
                            </div>
                        </section>
                    </template>

                    <template slot="footer" v-if="blends.length > 0">
                        <p class="subtitle is-6"><b-button @click='refresh()' type="button is-info " size="is-small" icon-left="refresh">Refresh</b-button></p>
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
                    <b-table-column field="name" label="Name" v-slot="props">
                        {{ props.row.folder }}
                    </b-table-column>
                    <b-table-column label="Files" v-slot="props">
                        {{ props.row.files.length }}
                    </b-table-column>

                    <template slot="detail" slot-scope="props">
                        <strong>Contents</strong>
                        <ul>
                            <li v-for="file in props.row.files" :key="file">{{file}}</li>
                        </ul>
                    </template>

                    <template slot="empty">
                        <section class="section">
                            <div class="content has-text-grey has-text-centered">
                                <p>No folders were found.</p>
                                <p class="subtitle is-6"><b-button @click='refresh()' type="button is-info " size="is-small" icon-left="refresh">Refresh</b-button></p>
                            </div>
                        </section>
                    </template>
                    <template slot="footer" v-if="folders.length > 0">
                        <p class="subtitle is-6"><b-button @click='refresh()' type="button is-info " size="is-small" icon-left="refresh">Refresh</b-button></p>
                    </template>
                </b-table>
            </b-tab-item>
        </b-tabs>
        <hr>
        <div class="columns" v-if="hasPermission">
            <div class="column">
                <h5 class="title is-5">Upload Blend Files</h5>
                <p>Upload any .blend files, overwriting existing files.</p>
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
                                <p>Drop your .blend files here or click to browse</p>
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
                <h5 class="title is-5">Upload ZIP to a Folder</h5>
                <p>ZIP will be extracted to a folder with the same name. It will also overwrite any existing folder.</p>
                <br>
                <b-field class="file">
                    <b-upload v-model="zip.file" accept=".zip" >
                        <a class="button is-primary">
                            <b-icon icon="upload" />
                            <span>Select a ZIP</span>
                        </a>
                    </b-upload>
                    <span class="file-name" v-if="zip.file">
                        {{ zip.file.name }}
                    </span>
                </b-field>
                <progress v-if="zip.uploading" class="progress" :value="zip.progress" max="100" />
                <b-field>
                    <b-button @click='uploadZIP' :disabled="!zip.file" type="button is-success">Upload Selected ZIP</b-button>
                </b-field>
            </div>
        </div>
        <div v-else>
            <b-message title="No Permission" type="is-danger" :closable="false">
                You do not have permission to upload blends or blend zips.
            </b-message>
        </div>
    </section>
</div>
</template>

<script>
export default {
    name: 'BlendChooser',
    props: ['bits'],
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
    computed: {
        hasPermission() {
            return this.bits.includes(4)
        }
    },
    methods:{
        refresh() {
            this.loading = true;
            this.$http.get('/api/blends')
            .then(response => {
                this.blends = response.data.blends
                this.folders = response.data.folders
            })
            .catch(err => {
                this.$buefy.snackbar.open({
                    message: 'Failed to fetch list of blends: ' + (err.response?err.response.status:err.message),
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
            this.$emit('close')
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
            this.$http.post('/api/blends/upload', formdata, {
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
                console.error('Upload failure: ', err)
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
            this.$http.post('/api/zips/upload', formdata, {
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
        },
        deleteBlend(name) {
            this.$buefy.dialog.confirm({
                title: 'Deleting blend',
                message: `Are you sure you want to delete <b>${name}</b>?`,
                confirmText: 'Delete',
                type: 'is-warning',
                hasIcon: true,
                onConfirm: () => {
                    this.$http.delete(`/api/blends/${encodeURIComponent(name)}`)
                    .then(() => {
                        this.$buefy.toast.open({
                            type: 'is-success',
                            message: `Deleted file ${name}`
                        })
                        const index = this.blends.findIndex(v => v.name === name)
                        if(index >= 0) this.blends.splice(index, 1);
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
                }
            })
        }
    },
    mounted() { 
        this.refresh() 
    }
}
</script>