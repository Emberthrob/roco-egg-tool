@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 判断当前状态：如果存在“标记文件”，说明已经加过后缀，本次执行“还原”
if exist ".txt_mode" (
    echo 正在还原文件后缀...
    call :RemoveTxt
    del ".txt_mode" >nul 2>&1
    echo 还原完成！
) else (
    echo 正在为所有文件添加 .txt 后缀...
    call :AddTxt
    echo done > ".txt_mode"
    echo 添加完成！
)

pause
exit /b

:: ---------- 添加 .txt 后缀 ----------
:AddTxt
for /r %%F in (*) do (
    :: 跳过本脚本自身和标记文件
    if /i not "%%~nxF"=="切换后缀.bat" if /i not "%%~nxF"==".txt_mode" (
        if /i not "%%~xF"==".txt" (
            ren "%%F" "%%~nxF.txt"
        )
    )
)
exit /b

:: ---------- 去掉 .txt 后缀 ----------
:RemoveTxt
for /r %%F in (*.txt) do (
    :: 跳过本脚本自身和标记文件
    if /i not "%%~nxF"=="切换后缀.bat" if /i not "%%~nxF"==".txt_mode" (
        set "name=%%~nF"
        set "ext=%%~xF"
        :: 去掉末尾的 .txt，恢复原名
        set "newname=!name:.txt=!"
        ren "%%F" "!newname!"
    )
)
exit /b