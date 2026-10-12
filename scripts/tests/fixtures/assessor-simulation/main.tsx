import React from 'react';
import {createRoot} from 'react-dom/client';
import {AssessorSimulationStoryboard} from '../../../../src/components/elearning/assessor-simulation-storyboard';
import './style.css';

createRoot(document.getElementById('app')!).render(<AssessorSimulationStoryboard />);
