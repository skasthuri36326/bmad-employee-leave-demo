package demo.leave.request.controller;

public class LeaveApiException extends RuntimeException {
    private final int status;
    private final String title;
    public LeaveApiException(int status, String title, String detail) { super(detail); this.status = status; this.title = title; }
    public int status() { return status; }
    public String title() { return title; }
}
