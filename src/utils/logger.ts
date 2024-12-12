export class Logger {
    private context: string;
    private logFile: string;
  
    constructor(context: string) {
      this.context = context;
      this.logFile = `${context}-${new Date().toISOString()}.log`;
    }
  
    private async writeToFile(entry: string) {
      try {
        // In development, we'll use localStorage as we can't write to filesystem
        if (process.env.NODE_ENV === 'development') {
          const currentLogs = localStorage.getItem(this.logFile) || '';
          localStorage.setItem(this.logFile, currentLogs + '\n' + entry);
          return;
        }
  
        // In production, you might want to send to a logging service
        console.log('[Logger]', entry);
      } catch (error) {
        console.error('Logging failed:', error);
      }
    }
  
    private formatEntry(level: string, event: string, data?: any): string {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        context: this.context,
        level,
        event,
        data
      });
    }
  
    log(event: string, data?: any) {
      const entry = this.formatEntry('INFO', event, data);
      this.writeToFile(entry);
    }
  
    error(event: string, error: any) {
      const entry = this.formatEntry('ERROR', event, {
        message: error.message,
        stack: error.stack,
        ...error
      });
      this.writeToFile(entry);
    }
  
    // Add method to retrieve logs (useful for development)
    getLogs(): string {
      if (process.env.NODE_ENV === 'development') {
        return localStorage.getItem(this.logFile) || '';
      }
      return '';
    }
  
    // Add method to download logs
    downloadLogs() {
      const logs = this.getLogs();
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.logFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }