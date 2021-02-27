var devCh= 9000; // change
var sessionCh= 9001;
var targetCh= 9010;
var directTargetCh= 9020;
var itemCh= 654;
var invChanged= 0;
var sessionON= 0;

var gd= {
    inv: {
      items: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      amounts: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    },
    dev: {
      items: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      amounts: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      params: {
        cmd:0,
        ty:0,
        tp:0,
        key:'',
      }
    },
    target: {
      nu: 0, // icon number
      na: '', // name
      targetable: 0,
      tid: '', // target id
      hp:0, // health
      ty:0, // type
      st: 0,
      key:'',
    }
  };

var cq= {
  idleOn: 1,
  msg8responded: 1,
};

var cdev= {
  msg:'',
  cmd:0,
  params: {
    di:0, // device icon
    n:'', // name
    ds: '', // description
    tid:'', // trans id
    did: '', // dev id
    tp:0, //trans param
    ty:0, // type
    st:0, // status
    si:0, // selected item
    ag: [], // allowed item groups
    at: [], // allowed item types
  },
  inv: {
    i:[],
    a:[],
    c:[],
    ri:[],
    ra:[],
    oi:[],
    oa:[],
    qfi:[],
    qfa:[],
    qui:[],
    qua:[],
  },
  parseMsg: function(){
    var parts= this.msg.split('|');
    this.cmd= parts[1];
    parts.shift();
    parts.shift();
    parts.forEach((item, i) => {
      var cp= item.split(':');
      if (cp[1].indexOf('%') > -1)
      {
        // 1%2%3,2%3%4,4%5%6
        // part is req
        this.inv[cp[0]]= [];
        var items= cp[1].split(',');
        items.forEach((citem, i) => {
          this.inv[cp[0]].push(citem.split('%'));
        });
      }
      else if (cp[1].indexOf(',') > -1)
      {
        // part is inv
        this.inv[cp[0]]= cp[1].split(',');
      }
      else
      {
        // part is param
        this.params[cp[0]]= cp[1];
      }
    });
  },
  // alt
  updateGd: function(){
    var invKeys= Object.keys(this.inv);
    var paramsKeys= Object.keys(this.params);
    invKeys.forEach((key, i) => {
      gd.dev[key]= this.inv[key];
    });
    paramsKeys.forEach((key, i) => {
      gd.dev.params[key]= this.params[key];
    });
  },
};

var logTxt= '';

function set_table_slot(snum, inv){
  document.getElementById(inv + '_ti' + snum).innerHTML= gd[inv].items[snum] + '<br>' + gd[inv].amounts[snum];
}

function fill_table(inv){
  var i=0;
  for (; i < 20; i++){
    set_table_slot(i, inv);
  }
}

function updateInv(invData){
  logTxt+= '<br> UPDATED inv ' + invData;
  $('#lsl_log').html(logTxt);
  gd= JSON.parse(decodeURI(invData));
  fill_table('inv');
}

function recieveItem(itemData){
  // itemdata= 214|key|trid|item|amount
  logTxt+= '<br> >>> RECIEVE ITEM itemData: ' + itemData;
  $('#lsl_log').html(logTxt);
  var idl= itemData.split('|');
  var remainingAmount= addNewItem(parseInt(idl[3]), parseInt(idl[4]));
  logTxt+= '<br> >>> RECIEVE ITEM remainingAmount: ' + remainingAmount;
  $('#lsl_log').html(logTxt);
  var transState= !remainingAmount;
  var response= [idl[1], idl[2], transState];
  logTxt+= '<br> >>> RECIEVE ITEM response: ' + response.toString();
  logTxt+= '<br> >>> RECIEVE ITEM inventory: ' + JSON.stringify(gd.inv);
  $('#lsl_log').html(logTxt);
  sendPOST('7', response.toString());
  fill_table('inv');
}

function addNewItem(item, amount){
  var ic= gd.inv.items;
  var ac= gd.inv.amounts;
  var rem= add_item('inv', item, amount);
  if (rem)
  {
    gd.inv.items= ic;
    gd.inv.amounts= ac;
  }
  else fill_table('inv');
  return (rem != 0);
}

function add_item(inv, item, amount, slots, total){
  if (slots == undefined && total == undefined)
  {
    var fs= find_all_item_slots(inv, item);
    slots= fs.slots;
    total= fs.total_amount;
  }
  if (slots.length)
  {
    slots.forEach((sitem, i) => {
      var ca= parseInt(gd[inv].amounts[sitem]);
      var free= 500 - ca;
      if (free && (amount >= free) && (amount > 0))
      {
        set_slot(inv, sitem, item, 500);
        amount-= free;
      }
      else if ((amount < free) && (amount > 0))
      {
        set_slot(inv, sitem, item, amount + ca);
        amount= 0;
        return 0;
      }
    });
  }
  if (amount)
  {
    var fs= find_all_item_slots(inv, 0);
    slots= fs.slots;
    if (slots.length)
    {
      slots.forEach((sitem, i) => {
        if ((amount >= 500) && (amount > 0))
        {
          set_slot(inv, sitem, item, 500);
          amount-= 500;
        }
        else if ((amount < 500) && (amount > 0))
        {
          set_slot(inv, sitem, item, amount);
          amount= 0;
          return 0;
        }
      });
    }
  }
  return amount;
}

function find_all_item_slots(inv, item){
  var inum= gd[inv].items.length; var i;
  var out= new searched_item(inv, item, [], [], 0);
  var ta= 0;
  var am;
  for (i = 0; i < inum; i++)
  {
    if (gd[inv].items[i] == item)
    {
      am= gd[inv].amounts[i];
      out.slots.push(i);
      out.amounts.push(am);
      ta+= am;
    }
  }
  out.total_amount= ta;
  return out;
}

class searched_item {
  constructor(inv, item, slots, amounts, total_amount) {
    this.inv= inv;
    this.item= item;
    this.slots= slots;
    this.amounts= amounts;
    this.total_amount= total_amount;
  }
}

function replaceAll(string, search, replace) {
  return string.split(search).join(replace);
}

function set_slot(inv, snum, item, amount){
  gd[inv].items[snum] = item;
  gd[inv].amounts[snum] = amount;
}

function changeSlot0(){
  set_slot('inv', 0, 100, 500);
  fill_table('inv');
  sendPOST('6', encodeURI(JSON.stringify(gd)))
}

function closeHud(){
  sendQ('main/2', '0');
}

function takeItem(){
  recieveItem('transid444, 333, 200');
}

function fillTable(){
  fill_table('inv');
}

function cLog(){
  logTxt= '';
  $('#lsl_log').html(logTxt);
}

function startSession(){
  sendPOST('11', '11');
  logTxt+= '<br> >> start session: sending cmd 1 to lsl, waithing lsl and dev response';
  $('#lsl_log').html(logTxt);
  sessionOn= 1;
}

function dtOP(){
  gd.dev.i[1]= 555;
  gd.dev.a[1]= 666;
  // how to pack inv?
  //(1002|trID|i:1,2,3,4,5|a:1,2,3,4,5)
  var msgr= '1002|trId1|i:' + gd.dev.i.toString() + '|a:' + gd.dev.a.toString();
  sendPOST('13/' + gd.target.key + '/9001', msgr);
}

// COMMS

function openCon(){
  var xhttp;
  xhttp=new XMLHttpRequest();
  logTxt+= '<br> sending command 8';
  $('#lsl_log').html(logTxt);
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4)
    {
      $('#status').html('status: ' + this.status + ', data: ' + xhttp.responseText);
      if (this.status == '200')
      {
        logTxt+= '<br> 200 got response to 8, no commands';
        $('#lsl_log').html(logTxt);
        cq.msg8responded == 1;
      }
      else if (this.status == '211')
      {
        cq.msg8responded == 1;
        logTxt+= '<br> 211 got new inv, ' + xhttp.responseText;
        $('#lsl_log').html(logTxt);
        $('#info').html('got new inv');
        updateInv(xhttp.responseText);
      }
      else if (this.status == '213')
      {

      }
      else if (this.status == '214')
      {
        cq.msg8responded == 1;
        logTxt+= '<br> 214 got new item, ' + xhttp.responseText;
        $('#lsl_log').html(logTxt);
        $('#info').html('got new item');
        recieveItem(xhttp.responseText);
      }
      else if (this.status == '219')
      {
        cq.msg8responded == 1;
        var msgStr= xhttp.responseText.substring(0, xhttp.responseText.length - 1);
        var cmds= msgStr.split(',');
        var cmdN= cmds.length;
        logTxt+= '<br> 219 got multi-command, ' + msgStr + ', cN= ' + cmdN;
        $('#lsl_log').html(logTxt);
        cmds.forEach((item, i) => {
          //var cmsg= item.split('|');
          var cm= item.split('|'); // current message
          logTxt+= '<br> 219 item= ' + item;
          var command= cm[0];
          logTxt+= '<br> 219 command= ' + command;
          $('#lsl_log').html(logTxt);
          if (command == '214')
          {
            logTxt+= '<br> 219 has 214, ' + item;
            $('#lsl_log').html(logTxt);
            recieveItem(item);
            invChanged= 1;
          }
          else if (command == '220') // mesage from target
          {
            // 220|key|sechash|devItem|devName|devID|health|type|targetable|status
            gd.target.key= cm[1];
            gd.target.in= cm[3];
            gd.target.name= cm[4];
            gd.target.id= cm[5];
            gd.target.hp= cm[6];
            gd.target.type= cm[7];
            gd.target.targetable= cm[8];
            gd.target.st= cm[9];
            logTxt+= '<br> 219 has 220, ' + 'new target, key:' + gd.target.key + ', icon num: ' + gd.target.in + ', name: ' + gd.target.name + ', hp: ' + gd.target.hp + ', type: ' +
            gd.target.type;
            $('#lsl_log').html(logTxt);
            if (([1,2,3,4].indexOf(gd.target.type) > -1) && (gd.target.st < 2) && !sessionON) // && sessionStatus= ready && session icon hidden
            {
              $('#sessionbtn').show();
              logTxt+= '<br> target is of device type, setting ON session icon';
              $('#lsl_log').html(logTxt);
            }
            // setTargetIcon();
          }
          else if (command == '221') // new target params from target description
          {
            // /221|key|health|status
            gd.target.hp= cm[2];
            gd.target.st= cm[3];
            if (([1,2,3,4].indexOf(gd.target.type) > -1) && (gd.target.st < 2) && !sessionON) // && sessionStatus= ready && session icon hidden
            {
              $('#sessionbtn').show();
            }
            logTxt+= '<br> 219 has 221, target params updated, hp= ' + gd.target.hp + ', status= ' + devStatus;
            $('#lsl_log').html(logTxt);
          }
          else if (command == '222') // passing dev message
          {
            // assuming session is on
            logTxt+= '<br> 219 has 222, got new dev inv,' + item;
            $('#lsl_log').html(logTxt);
            // get command
            // 222|key|dev command|rest of message
            var devcmd= cm[2];
            if (devcmd == 1100) // last message accepted
            {
              // get transid, compare it with the sent one
              // if it's not the same, reset last change
              logTxt+= '<br> dev replied to inv change, tid: ' + cm[1];
              $('#lsl_log').html(logTxt);
            }
            // else if (devcmd == 1101) // sending new inventory
            // else if (devcmd == 1102) // force end session, reset last change
            // else if (devcmd == 1103) // session denied, someone else started it in meantime
            else if (devcmd == 1104) // session start accepted, sending params and inventory
            {
              sessionON= 1;
              $('#sessionbtn').hide();
              cdev.message= item;
              cdev.parseMsg();
              cdev.updateGd();
              logTxt+= '<br> new dev inv: i= ' + gd.dev.i.toString() + ', a= ' + gd.dev.a.toString();
              $('#lsl_log').html(logTxt);
              // parse message, copy inv to gd.dev, generate html and display dev window
              // for test purposes, just get i and a, change one slot and upate dev
            }
            // parse dev message into inventory and overwrite
          }
        });
        if (invChanged)
        {
           sendPOST('6', encodeURI(JSON.stringify(gd)));
           invChanged= 0;
        }
      }
      else if (this.status == '504')
      {
        cq.msg8responded == 1;
        logTxt+= '<br> no response to 8';
        $('#info').html('no response to 8');
        $('#lsl_log').html(logTxt);
      }
      //if (cq.cmds.length) cq.send();
      else if (cq.idleOn == 1) openCon();
    }
  };
  xhttp.open('POST', '8', true);
  xhttp.send('8');
}

function sendPOST(command, message){
  var xhttp;
  xhttp=new XMLHttpRequest();
  logTxt+= '<br> sending new command: ' + command + ', ' + message;
  $('#lsl_log').html(logTxt);
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4)
    {
      $('#status').html('status: ' + this.status + ', data: ' + xhttp.responseText);
      if (this.status == 210)
      {
        logTxt+= '<br> 210 for: ' + path + ', ' + body;
        $('#lsl_log').html(logTxt);
      }
      else if (this.status == 211)
      {
        //cq.msg8responded= 1;
        logTxt+= '<br> 211 got new inv, ' + xhttp.responseText;
        $('#lsl_log').html(logTxt);
        $('#info').html('got new inv');
        updateInv(xhttp.responseText);
      }
      else if (status == 504)
      {
        logTxt+= '<br> no response to path: ' + path + ', ' + body;
        $('#lsl_log').html(logTxt);
      }
      if (cq.msg8responded == 1 && cq.idleOn == 1) openCon();
    }
  };
  xhttp.open('POST', command, true);
  xhttp.send(message);
}


$(document).ready(function(){
      $('#info').html('initialized');
      sendPOST('1', '1');
      $('#sessionbtn').hide();
      });
