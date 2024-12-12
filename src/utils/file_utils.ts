export interface StoryElement {
    type: 'narrate' | 'speak' | 'input';
    character?: string;
    emotion?: string;
    content: string;
    options?: {
      text: string;
      next: string;
    }[];
    prompt?: string;
  }
  
  export interface StoryScene {
    id: string;
    ref: string;
    elements: StoryElement[];
  }
  
  export async function loadStoryContent(filename: string): Promise<string> {
    try {
      const response = await fetch(`/stories/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load story content: ${response.statusText}`);
      }
      const content = await response.text();
      return content;
    } catch (error) {
      console.error('Error loading story content:', error);
      throw error;
    }
  }
  
  export function parseStoryMd(content: string): StoryScene {
    const lines = content.split('\n');
    const scene: StoryScene = {
      id: '',
      ref: '',
      elements: []
    };
    
    let currentElement: Partial<StoryElement> | null = null;
    
    for (const line of lines) {
      if (line.startsWith('@scene:')) {
        scene.id = line.replace('@scene:', '').trim();
      } else if (line.startsWith('@ref:')) {
        scene.ref = line.replace('@ref:', '').trim();
      } else if (line.startsWith('@narrate')) {
        if (currentElement) scene.elements.push(currentElement as StoryElement);
        currentElement = { type: 'narrate' };
      } else if (line.startsWith('@speak:')) {
        if (currentElement) scene.elements.push(currentElement as StoryElement);
        currentElement = {
          type: 'speak',
          character: line.replace('@speak:', '').trim()
        };
      } else if (line.startsWith('@input:')) {
        if (currentElement) scene.elements.push(currentElement as StoryElement);
        currentElement = {
          type: 'input',
          options: []
        };
      } else if (line.startsWith('[emotion:')) {
        if (currentElement) {
          currentElement.emotion = line.replace('[emotion:', '').replace(']', '').trim();
        }
      } else if (line.startsWith('[prompt:')) {
        if (currentElement) {
          currentElement.prompt = line.replace('[prompt:', '').replace(']', '').trim().replace(/"/g, '');
        }
      } else if (line.startsWith('-') && currentElement?.type === 'input') {
        const [text, next] = line.replace('-', '').trim().split('->').map(s => s.trim());
        currentElement.options = currentElement.options || [];
        currentElement.options.push({
          text: text.replace(/"/g, ''),
          next: next
        });
      } else if (line.trim() && line.trim().startsWith('"')) {
        if (currentElement) {
          currentElement.content = line.trim().replace(/"/g, '');
        }
      } else if (line.trim() && !line.startsWith('[')) {
        if (currentElement) {
          currentElement.content = line.trim();
        }
      }
    }
    
    if (currentElement) scene.elements.push(currentElement as StoryElement);
    
    return scene;
  }