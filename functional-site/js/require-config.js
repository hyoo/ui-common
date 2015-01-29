// This is main.js
define('jquery', [], function() {
    return jQuery;
});
define('kbaseuserprofileserviceclient', [], function() {
  return UserProfile;
});
define('kbaseworkspaceserviceclient', [], function() {
  return Workspace;
});
define('postal', [], function () {
  return postal;
});
define('q', [], function () {
  return Q;
});
require.config({
    baseUrl: '/',
    catchError: true,
    onError: function(err) {
		 alert("Error:" + err);
    },
    paths: {
      nunjucks: '/ext/nunjucks/nunjucks.min',
      md5: '/ext/md5/md5',
      lodash: '/ext/lodash/lodash-2.4.1.min',
     //  postal: '/ext/postal/postal-0.12.4.min',
      'postal.request-response': '/ext/postal/postal.request-response.min',
      postaldeluxe: '/src/postal/postal-deluxe',

      domReady: '/ext/require-plugins/domReady', 
    	text: '/ext/require-plugins/text',
      json: '/ext/require-plugins/json', 

      // Service Clients
      kbase_narrative_method_store_client: '/functional-site/assets/js/kbclient/narrative_method_store_Client',

      // widgets
      // userProfileServiceClient: '/functional-site/assets/js/kbclient/user_profile_Client.js',
      kbasesocialwidget: '/src/widgets/social/kbaseSocialWidget',
      kbaseuserprofile: '/src/widgets/social/kbaseUserProfile',
      kbaseuserprofilewidget: '/src/widgets/social/kbaseUserProfileWidget',
      kbaseuserrecentactivity: '/src/widgets/social/kbaseUserRecentActivity',
      kbaseuserpopularnarratives: '/src/widgets/social/kbaseUserPopularNarratives',
      kbaseusercollaboratornetwork: '/src/widgets/social/kbaseUserCollaboratorNetwork',
      kbaseusersearch: '/src/widgets/social/kbaseUserSearch',
      kbaseuserbrowsenarratives: '/src/widgets/social/kbaseUserBrowseNarratives',
      kbaseusersummary: '/src/widgets/social/kbaseUserSummary',
      kbasesession: '/src/kbaseSession',
      kbaseconfig: '/src/kbaseConfig', 
      kbaseutils: '/src/kbaseUtils',
      kbasecookie: '/src/kbaseCookie',
      kbasetest: '/src/kbaseTest',
      kbasenavbar: '/src/widgets/kbaseNavbar',
      kbasebasewidget: '/src/widgets/kbaseBaseWidget',
      kbaseloginwidget: '/src/widgets/kbaseLoginWidget',
      // Dashboard widgets
      dashboard_widget: '/src/widgets/dashboard/DashboardWidget',
      dashboard_profile_widget: '/src/widgets/dashboard/ProfileWidget',
      dashboard_narratives_widget: '/src/widgets/dashboard/NarrativesWidget',
      dashboard_apps_widget: '/src/widgets/dashboard/AppsWidget',
      dashboard_data_widget: '/src/widgets/dashboard/DataWidget'
    },
   shim: { 
    'kbaseuserprofileserviceclient': {
      exports: 'UserProfile'
     },
     'kbaseworkspaceserviceclient': {
       exports: 'Workspace'
      },
      'kbase_narrative_method_store_client': {
        exports: 'NarrativeMethodStore'
      },
     q: {
       exports: 'Q'
     }
   }
    
  
});