import '@fontsource-variable/inter';
import React from 'react';import{createRoot}from'react-dom/client';import Workspace from './Workspace';import {CloudGate} from './Cloud';import './style.css';createRoot(document.getElementById('root')).render(<CloudGate><Workspace/></CloudGate>);
