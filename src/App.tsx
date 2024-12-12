import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConsolePage } from './pages/ConsolePage';
import { StoryConsolePage } from './pages/StoryConsolePage';
import './App.scss';

function App() {
  return (
    <div data-component="App">
      <Router>
        <Routes>
          <Route path="/" element={<ConsolePage />} />
          <Route path="/story" element={<StoryConsolePage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;