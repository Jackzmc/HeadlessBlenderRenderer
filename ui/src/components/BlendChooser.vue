<template>
<b-modal :active.sync="blend_chooser.active">
    <div class="box">
        <h3 class='title is-3'>Blend File Chooser</h3>
        <b-loading :is-full-page="false" :active.sync="loading"></b-loading>
        
        <h5 class="title is-5">Existing Blend Files <a @click='refreshBlendChooser' class="button is-info is-small"><b-icon icon="refresh"></b-icon><span>Refresh</span></a></h5>
        <b-table
        :data="blends||[]"
        :striped="true"
        :hoverable="true"
        :loading="blends == null"
        >
            <template slot-scope="props">
                <b-table-column field="name" label="Name">
                    {{ props.row.name }}
                </b-table-column>

                <b-table-column label="Action">
                    <a :disabled="!socket_status" @click="chooseBlend(props.row.name)" class="button is-primary is-small">Use</a>
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
                        <p>Nothing here.</p>
                    </div>
                </section>
            </template>
        </b-table>
        <hr>
        <div class="columns">
            <div class="column">
                <h5 class="title is-5">Upload Blend Files</h5>
                <b-field>
                    <b-upload :disabled="!socket_status" id="uploader" v-model="uploads"
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
            </div>
            <div class="column">
                <h5 class="title is-5">Upload ZIP as folder</h5>
                <b-field>
                    <b-upload :disabled="!socket_status" id="uploader"
                        accept=".zip"
                        drag-drop>
                        <section class="section">
                            <div class="content has-text-centered">
                                <p>
                                    <b-icon
                                        icon="upload"
                                        size="is-large">
                                    </b-icon>
                                </p>
                                <p>Drop your zip here or click to upload</p>
                            </div>
                        </section>
                    </b-upload>
                </b-field>
            </div>
        </div>

        <div class="tags">
            <span v-for="(file, index) in blend_chooser.uploads"
                :key="index"
                class="tag is-primary" >
                {{file.name}}
                <button class="delete is-small"
                    type="button"
                    @click="deleteDropFile(index)">
                </button>
            </span>
        </div>
        <span v-if="uploading">
            <progress v-for="(upload,index) in uploads" :key='index' class="progress" :value="upload.progress" max="100"></progress>
        </span>
        
        <b-field>
            <b-button @click='uploadFiles' :disabled="uploads.length == 0||!socket_status" type="button is-success">Upload Files</b-button>
        </b-field>
    </div>
</b-modal>
</template>

<script>
import Modal from 'buefy/dist/components/modal'
export default {
    name:"blend-chooser",
    props:['blends'],
    methods:{
        refreshBlendChooser() {
            this.$emit('refresh')
        },
        chooseBlend() {
            
        },
        uploadFiles() {
            this.$parent.uploadFiles();
        }
    },
    data() {
        return {
            uploads: [],
            uploading: false,
            loading: false
        }
    },
    components:{
        Modal
    }
}
</script>