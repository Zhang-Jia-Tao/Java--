<script setup lang="ts">
import { ref } from 'vue';
import { http, errorText } from '../api/http';
import type { ApiResponse, UploadRes } from '../types/api';

/**
 * 上传按钮：前端只做「挡掉明显不合法」的校验，真正的白名单/魔数校验在后端。
 * 前端校验是体验，后端校验才是安全。
 */
const MAX = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const emit = defineEmits<{ uploaded: [url: string] }>();

const uploading = ref(false);
const progress = ref(0);
const err = ref('');
const preview = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

function pick() {
  inputRef.value?.click();
}

async function onChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // 允许连续选同一个文件
  if (!file) {
    return;
  }
  err.value = '';
  if (!ALLOWED.includes(file.type)) {
    err.value = '只支持 jpg / png / webp / gif';
    return;
  }
  if (file.size > MAX) {
    err.value = `文件 ${(file.size / 1024 / 1024).toFixed(1)}MB，超过 5MB`;
    return;
  }

  const form = new FormData();
  form.append('file', file);

  uploading.value = true;
  progress.value = 0;
  try {
    const res = await http.post<ApiResponse<UploadRes>>('/files', form, {
      onUploadProgress: (evt) => {
        if (evt.total) {
          progress.value = Math.round((evt.loaded / evt.total) * 100);
        }
      }
    });
    preview.value = res.data.data.url;
    emit('uploaded', res.data.data.url);
  } catch (e) {
    err.value = errorText(e);
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="row">
    <button class="btn ghost" type="button" :disabled="uploading" @click="pick">
      {{ uploading ? `上传中 ${progress}%` : '上传图片' }}
    </button>
    <input ref="inputRef" type="file" accept="image/*" hidden @change="onChange" />
    <span v-if="err" class="err" style="margin: 0">{{ err }}</span>
    <img v-if="preview" :src="preview" class="preview" alt="已上传" />
  </div>
</template>
