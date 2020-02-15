import {
  JupyterFrontEnd, JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import {NotebookPanel,INotebookModel} from '@jupyterlab/notebook'
import { IStateDB,ISettingRegistry } from '@jupyterlab/coreutils';
import { IDisposable, DisposableDelegate } from '@phosphor/disposable';
import { ToolbarButton } from '@jupyterlab/apputils';



const BASE_DIR = 'baseDir';
const NBCONVERT_OPTIONS = 'nbconvertOptions';
const PLUGIN_ID = 'jupyterlab-printview';
const SETTING_ID = "jupyterlab-printview:plugin";

/**
 * Initialization data for the jupyterlab-printview extension.
 */
const printViewPlugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires:[
    ISettingRegistry,
    IStateDB
  ],
  activate: (app: JupyterFrontEnd,settingRegistry:ISettingRegistry,state:IStateDB) => {
    console.log('JupyterLab extension jupyterlab-printview is activated!');

    let baseDir = '';
    let nbconvertOptions = '';

    /**
     * update settings
     */
    async function updateSettings(settings:ISettingRegistry.ISettings):Promise<void>{
      baseDir = settings.get(BASE_DIR).composite as string | null;
      nbconvertOptions = settings.get(NBCONVERT_OPTIONS).composite as string | null;
      saveStateDb(baseDir,baseDir);
      saveStateDb(NBCONVERT_OPTIONS,nbconvertOptions);
    }

    Promise.all([settingRegistry.load(SETTING_ID)]).then(async ([settings]) => {
      await updateSettings(settings);
      settings.changed.connect(async () =>{
        await updateSettings(settings);
      })
    }).catch((reason:Error)=>{
      console.error(reason.message);
    })

    function saveStateDb(key:string,value:string){
      state.save(key,value).then((restored)=>{
      })
    }

    app.serviceManager.nbconvert.getExportFormats();
    app.docRegistry.addWidgetExtension("Notebook",new ButtonExtensionPrintHtml(app,state));

  }
};

export class ButtonExtensionPrintHtml implements DocumentRegistry.IWidgetExtension<NotebookPanel,INotebookModel> {

  public app:JupyterFrontEnd;
  public state:IStateDB;

  constructor(app:JupyterFrontEnd,state:IStateDB){
    this.app = app;
    this.state = state;
  }

  createNew(panel:NotebookPanel,context:DocumentRegistry.IContext<INotebookModel>):IDisposable {

    const commands = this.app.commands;
    
    let callback = () =>{
      this.state.toJSON().then(dict => {
        let localPath = context.localPath;
        let htmlPath = localPath.replace('.ipynb','.html')
        const filePath = dict[BASE_DIR]+localPath;
        const defalutKernel = context.session.kernel;

        const code = "import os;os.system(\"jupyter nbconvert "+dict['nbconvertOptions']+" "+filePath+" \")"
        Promise.all([defalutKernel.requestExecute({"code":code}).done]).then(()=>{
          commands.execute("docmanager:open",{path:htmlPath})
        })
      })
        
    }

    let button = new ToolbarButton({
      className:'print-view',
      iconClassName:'fa fa-print',
      onClick:callback,
      tooltip:'printView'
    });

    panel.toolbar.insertAfter('cellType','print-view',button);
    return new DisposableDelegate(()=>{
      button.dispose();
    })
  }
}

export default printViewPlugin;
