<template>
  <f7-page name="apiTest" :page-content="false">
    <f7-page-content ref="сontentRef">
      <f7-navbar title="Тест JS API"></f7-navbar>

      <f7-block-title>Яркость экрана</f7-block-title>
      <f7-list simple-list outline-ios strong-ios>
        <f7-list-item>
          <div>
            <f7-icon ios="f7:sun_min" md="material:brightness_low" />
          </div>
          <div style="width: 100%; margin: 0 16px">
            <f7-range 
              :min="0" 
              :max="100" 
              :step="1" 
              v-model:value="currentBrightness" 
              :label="true" 
              @range:change="onBrightnessChange"
              color="orange"/>
          </div>
          <div>
            <f7-icon ios="f7:sun_max_fill" md="material:brightness_high" />
          </div>
        </f7-list-item>
        <f7-list-item>
          <f7-button fill @click="resetBrightness">Cбросить яркость</f7-button>
        </f7-list-item>
      </f7-list>

      <f7-block strong-ios outline-ios class="grid grid-cols-2 grid-gap">
        <f7-button fill @click="showThemeAlert">Тема устройства</f7-button>
      </f7-block>

      <f7-list strong-ios dividers-ios outline-ios>
        <f7-list-item title="Показывать статус бар">
          <template #after>
            <f7-toggle v-model:checked="isStatusBarShown"/>
          </template>
        </f7-list-item>
      </f7-list>

      <f7-list strong-ios dividers-ios outline-ios>
        <f7-list-item title="Полный экран">
          <template #after>
            <f7-toggle v-model:checked="isFullscreen"/>
          </template>
        </f7-list-item>
      </f7-list>

      <f7-list strong-ios dividers-ios outline-ios>
        <f7-list-item title="Не гасить экран">
          <template #after>
            <f7-toggle v-model:checked="isKeepScreenOn"/>
          </template>
        </f7-list-item>
      </f7-list>

      <f7-list strong-ios outline-ios>
        <f7-list-input label="Цвет статусбара" type="text" placeholder="#000000" v-model:value="statusBarColor"></f7-list-input>
        <f7-list-item>
          <f7-button fill @click="setStatusBarColor">Установить</f7-button>
        </f7-list-item>
      </f7-list>

      <f7-list strong-ios dividers-ios outline-ios>
        <f7-list-item title="Прокручивание с помощью кнопок громкости">
          <template #after>
            <f7-toggle v-model:checked="isVolumeButtonsScroll"/>
          </template>
        </f7-list-item>
      </f7-list>

      <f7-block-title>Buttons</f7-block-title>
      <f7-block strong-ios outline-ios class="grid grid-cols-2 grid-gap">
        <f7-button>Button</f7-button>
        <f7-button fill>Fill</f7-button>

        <f7-button raised>Raised</f7-button>
        <f7-button raised fill>Raised Fill</f7-button>

        <f7-button round>Round</f7-button>
        <f7-button round fill>Round Fill</f7-button>

        <f7-button outline>Outline</f7-button>
        <f7-button round outline>Outline Round</f7-button>

        <f7-button small outline>Small</f7-button>
        <f7-button small round outline>Small Round</f7-button>

        <f7-button small fill>Small</f7-button>
        <f7-button small round fill>Small Round</f7-button>

        <f7-button large raised>Large</f7-button>
        <f7-button large fill raised>Large Fill</f7-button>

        <f7-button large fill raised color="red">Large Red</f7-button>
        <f7-button large fill raised color="green">Large Green</f7-button>
      </f7-block>

      <f7-block-title>Checkbox group</f7-block-title>
      <f7-list strong-ios outline-ios dividers-ios>
        <f7-list-item checkbox name="my-checkbox" value="Books" title="Books"></f7-list-item>
        <f7-list-item checkbox name="my-checkbox" value="Movies" title="Movies"></f7-list-item>
        <f7-list-item checkbox name="my-checkbox" value="Food" title="Food"></f7-list-item>
      </f7-list>

      <f7-block-title>Radio buttons group</f7-block-title>
      <f7-list strong-ios outline-ios dividers-ios>
        <f7-list-item radio name="radio" value="Books" title="Books"></f7-list-item>
        <f7-list-item radio name="radio" value="Movies" title="Movies"></f7-list-item>
        <f7-list-item radio name="radio" value="Food" title="Food"></f7-list-item>
      </f7-list>
    </f7-page-content>
  </f7-page>
</template>
<script setup>
import { ref, watch, onMounted } from 'vue';
import { f7, f7ready } from 'framework7-vue';
import { Dom7 as $ } from 'framework7';
import deviceAPI from '../js/device/device-api';

const currentBrightness = ref(deviceAPI.getBrightness());

const onBrightnessChange = (newVal) => {
  console.log("onBrightnessChange = ", newVal);
  deviceAPI.setBrightness(newVal);
};

const resetBrightness = () => {
  deviceAPI.resetBrightness();
  currentBrightness.value = deviceAPI.getBrightness();
};

const showThemeAlert = () => {
  const theme = deviceAPI.getTheme();
  f7.dialog.alert(`Тема устройства: ${theme}`);
};

const isStatusBarShown = ref(true);
watch(isStatusBarShown, (newVal) => {
  deviceAPI.showStatusBar(newVal);
  console.log("isStatusBarShown", newVal);
});

const isFullscreen = ref(false);
watch(isFullscreen, (newVal) => {
  deviceAPI.setFullScreen(newVal);
  console.log("isFullscreen", newVal);
});

const isKeepScreenOn = ref(false);
watch(isKeepScreenOn, (newVal) => {
  deviceAPI.keepScreenOn(newVal);
  console.log("isKeepScreenOn", newVal);
});

const statusBarColor = ref("#000000");
const setStatusBarColor = () => {
  deviceAPI.setStatusBarColor(statusBarColor.value);
  console.log(statusBarColor.value);
};

const сontentRef = ref(null);
const isVolumeButtonsScroll = ref(false);

watch(isVolumeButtonsScroll, (newVal) => {
  //console.log("watch: pageContentRef", сontentRef.value);
  console.log(сontentRef.value.$el);
  const $сontent = $(сontentRef.value.$el);
  if(newVal) {
    deviceAPI.onVolumeKey((keyCode, event) => {
      switch (keyCode) {
        case deviceAPI.KEYCODE_VOLUME_UP:
          $сontent.scrollTop($сontent.scrollTop() + 50, 200);
          break;

        case deviceAPI.KEYCODE_VOLUME_DOWN:
          $сontent.scrollTop($сontent.scrollTop() - 50, 200);
          break;
      }
    });
  } else {
    deviceAPI.offVolumeKey();
  }
});

console.log(f7);
</script>