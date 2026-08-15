import Modal from './components/modal.js';
import './common/i18n.js';
import './common/header-scroll.js';
import './common/preloader.js';
import { initUserMenu } from './auth/user-menu.js';

Modal.init();
initUserMenu();
