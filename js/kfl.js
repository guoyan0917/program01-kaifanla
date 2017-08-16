var app=angular.module('kfl',['ionic']);

//自定义一个用于 发送http请求的服务
app.service('$kflHttp',['$http','$ionicLoading',function($http,$ionicLoading){
    this.sendRequest=function(url,handleSucc){
        $ionicLoading.show({template:'loading...'});
        $http
            .get(url)
            .success(function(data){
                $ionicLoading.hide();
                handleSucc(data);
            })
    }
}]);

app.config(function($stateProvider,$urlRouterProvider,$ionicConfigProvider){
    $ionicConfigProvider.tabs.position('bottom');
    $stateProvider
        .state('kflStart',{
            url:'/kflStart',
            templateUrl:'tpl/start.html'
        })
        .state('kflMain',{
            url:'/kflMain',
            templateUrl:'tpl/main.html',
            controller:'MainCtrl'
        })
        .state('kflDetail',{
            url:'/kflDetail/:id',//接收方
            templateUrl:'tpl/detail.html',
            controller:'DetailCtrl'
        })
        .state('kflOrder',{
            url:'/kflOrder/:cartDetail/:price',
            templateUrl:'tpl/order.html',
            controller:'OrderCtrl'
        })
        .state('kflMyOrder',{
            url:'/kflMyOrder',
            templateUrl:'tpl/myOrder.html',
            controller:'myOrderCtrl'
        })
        .state('kflCart',{
            url:'/kflCart',
            templateUrl:'tpl/cart.html',
            controller:'CartCtrl'
        })
    ;
    $urlRouterProvider.otherwise('/kflStart');
});

app.controller('parentCtrl',['$scope','$state',function($scope,$state){
    $scope.jump=function(desState,arg){
        $state.go(desState,arg);
    };
    //console.log("aaa");
}]);

app.controller('MainCtrl',['$scope','$kflHttp',function ($scope, $kflHttp){
    $scope.hasMore=true;
    //加载首页数据
    $kflHttp.sendRequest('data/dish_getbypage.php',function(data){
        //console.log(data);
        $scope.dishList=data;
    });
    $scope.loadMore=function(){
        $kflHttp.sendRequest(
            'data/dish_getbypage.php?start='+$scope.dishList.length,
            function(data){
                if(data.length<5){
                    $scope.hasMore=false;
                }
                //console.log(data);
                $scope.dishList=$scope.dishList.concat(data);
                $scope.$broadcast('scroll.infiniteScrollComplete');
            });
    };
    //在ng项目中，如果需要用到方向2绑定，也就是ngModel，官方建议是：要将模型数据存储在一个对象中
    $scope.inputTxt={kw:''};
    //搜索框：查找菜品==>监听！用户输入
    $scope.$watch('inputTxt.kw',function(){
        //console.log($scope.inputTxt.kw);
        $kflHttp.sendRequest('data/dish_getbykw.php?kw='+$scope.inputTxt.kw,function(data){
            if(data.length>0){
                $scope.dishList=data;
            }
        });
    });
}]);

app.controller('DetailCtrl',['$scope','$kflHttp','$stateParams','$ionicPopup',function($scope,$kflHttp,$stateParams,$ionicPopup){
    //$stateParams==>接收参数
    //console.log($stateParams);
    //更新购物车信息
    $scope.addToCart=function(){
        $kflHttp.sendRequest('data/cart_update.php?uid=1&did='+$stateParams.id+'&count=-1',function(result){
            console.log(result);
            //添加到购物车的结果弹窗显示
            //$ionicPopup.alert/prompt/confirm()
            $ionicPopup.alert({
                template:'添加成功到购物车'
            });
        });
    };

    //发起网络请求，取指定id的详情信息并显示在视图上
    $kflHttp.sendRequest('data/dish_getbyid.php?id='+$stateParams.id,function(data){
        //console.log(data);
        $scope.dishDetail=data[0];
        //console.log($scope.dishDetail[0].name);
    })
}]);

app.controller('OrderCtrl',['$scope','$kflHttp','$stateParams','$httpParamSerializerJQLike',function($scope,$kflHttp,$stateParams,$httpParamSerializerJQLike){
    //$stateParams接收到的参数
    console.log($stateParams); //Object {id:"3"}
    console.log($stateParams.price);
    $scope.order={//对照数据库order_add.php接收数据的名称
        userid:1,
        totalPrice:$stateParams.price,
        cartDetail:$stateParams.cartDetail
    };
    $scope.submitOrder=function(){
        //console.log($scope.order);
        //序列化
        var args=$httpParamSerializerJQLike($scope.order);
        console.log(args);
        $kflHttp.sendRequest('data/order_add.php?'+args,function(data){
            console.log(data);
            if(data.length>0){
                if(data[0].msg=='succ'){
                    sessionStorage.setItem('phone',$scope.order.phone);
                    $scope.result='下单成功，编号为：'+data[0].oid;
                }else{
                    $scope.result='下单失败';
                }
            }
        });
    }
}]);

app.controller('myOrderCtrl',['$scope','$kflHttp',function($scope,$kflHttp){
    $kflHttp.sendRequest('data/order_getbyuserid.php?userid=1',function(result){
        console.log(result);
        $scope.orderList=result.data;
    });
}]);

app.controller('CartCtrl',['$scope','$kflHttp',function($scope,$kflHttp){
    $scope.editEnable=false;
    $scope.editText='编辑';
    $scope.toggleEdit=function(){
        $scope.editEnable=!$scope.editEnable;
        if($scope.editEnable){
            $scope.editText='完成';
        }else{
            $scope.editText='编辑';
        }
    };
    $kflHttp.sendRequest('data/cart_select.php?uid=1',function(result){
        console.log(result);
        $scope.cart=result.data;//result.data是一个数组
    });

    //按钮-减号
    $scope.minus=function(index){
        var dish=$scope.cart[index];
        console.log(dish);
        if(dish.dishCount==1){
            return;
        }else{
            dish.dishCount--;
            update(dish.did,dish.dishCount);
        }
    };

    //按钮+加号
    $scope.add=function(index){
        var dish=$scope.cart[index];
        console.log(dish);
        dish.dishCount++;
        update(dish.did,dish.dishCount);
    };

    //数量更新点击按钮函数
    function update(did,count){
        $kflHttp.sendRequest('data/cart_update.php?uid=1&did='+did+'&count='+count,function(data){
            //console.log(data);
        })
    }

    //合计
    $scope.cart=[];
    $scope.sumAll=function(){
        var result=0;
        for(var i=0;i<$scope.cart.length;i++){
            var dish=$scope.cart[i];
            result+=dish.price*dish.dishCount;
        }
        return result;
    };

    //提交订单按钮
    $scope.jumpToOrder=function(){
        //准备要传递的参数totalPrice
        var totalPrice=$scope.sumAll();
        //console.log(totalPrice);
        //json格式的序列化==>将一个普通的对象或数组序列化，json格式的字符串
        var totalDetail=angular.toJson($scope.cart);
        //console.log(detail);
        $scope.jump('kflOrder',{cartDetail:totalDetail,price:totalPrice});
    };

}]);