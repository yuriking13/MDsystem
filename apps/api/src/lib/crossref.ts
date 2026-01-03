export interface CrossrefResponse {
  message: {
    items?: Array<{
      title?: string[];
      'container-title'?: string[];
      author?: Array<{
        family?: string;
        given?: string;
      }>;
      abstract?: string;
      type?: string;
      link?: Array<{
        URL?: string;
        'content-type'?: string;
        'intended-application'?: string;
      }>;
    }>;
    'total-results': number;
  };
}
